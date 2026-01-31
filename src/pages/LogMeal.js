import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { offlinePost } from '../services/api';
import { saveGuestMeal } from '../services/guestStorage';

function LogMeal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest } = useAuth();
  const [searchParams] = useSearchParams();
  const isManualMode = isGuest || searchParams.get('manual') === 'true';

  // Get image passed from Home page
  const capturedImage = location.state?.capturedImage;

  const fileInputRef = useRef(null);
  const [image, setImage] = useState(capturedImage || null);
  const [preview, setPreview] = useState(capturedImage ? URL.createObjectURL(capturedImage) : null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Auto-submit when image is passed from Home
  useEffect(() => {
    if (capturedImage && !result && !loading) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual entry state
  const [manualFoods, setManualFoods] = useState([{ name: '', ingredients: '' }]);

  // Clarification state
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationOptions, setClarificationOptions] = useState([]);
  const [pendingMealId, setPendingMealId] = useState(null);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setNeedsClarification(false);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await offlinePost('/meals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Check if saved offline
      if (response.data.offline) {
        setResult({
          offline: true,
          foods: [{ name: 'Meal saved offline', category: 'Pending sync' }],
          notes: 'This meal will be analyzed when you\'re back online'
        });
        return;
      }

      // Check if AI needs clarification (low confidence items)
      const lowConfidenceFoods = response.data.foods?.filter(f => f.confidence && f.confidence < 0.7);
      if (lowConfidenceFoods?.length > 0 && response.data.clarificationOptions) {
        setNeedsClarification(true);
        setClarificationOptions(response.data.clarificationOptions);
        setPendingMealId(response.data.id);
        setResult(response.data);
      } else {
        setResult(response.data);
      }
    } catch (error) {
      console.error('Failed to upload meal:', error);
      alert('Failed to analyze meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClarification = async (foodIndex, selectedOption) => {
    try {
      // Update the meal with the corrected food
      await api.put(`/meals/${pendingMealId}/clarify`, {
        foodIndex,
        correctedName: selectedOption
      });

      // Update local state
      const updatedFoods = [...result.foods];
      updatedFoods[foodIndex].name = selectedOption;
      updatedFoods[foodIndex].confidence = 1.0;
      setResult({ ...result, foods: updatedFoods });

      // Clear clarification for this item
      const remainingOptions = clarificationOptions.filter((_, i) => i !== foodIndex);
      if (remainingOptions.length === 0) {
        setNeedsClarification(false);
        setClarificationOptions([]);
      } else {
        setClarificationOptions(remainingOptions);
      }
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleManualSubmit = async () => {
    const validFoods = manualFoods.filter(f => f.name.trim());
    if (validFoods.length === 0) {
      alert('Please enter at least one food item');
      return;
    }

    setLoading(true);
    try {
      const foods = validFoods.map(f => ({
        name: f.name.trim(),
        ingredients: f.ingredients.split(',').map(i => i.trim()).filter(Boolean)
      }));

      if (isGuest) {
        await saveGuestMeal(foods);
        setResult({ foods });
      } else {
        const response = await offlinePost('/meals/manual', { foods });

        if (response.data.offline) {
          setResult({
            offline: true,
            foods: foods.map(f => ({ name: f.name, ingredients: f.ingredients })),
            notes: 'Saved offline - will sync when connected'
          });
        } else {
          setResult(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert('Failed to log meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addManualFood = () => {
    setManualFoods([...manualFoods, { name: '', ingredients: '' }]);
  };

  const updateManualFood = (index, field, value) => {
    const updated = [...manualFoods];
    updated[index][field] = value;
    setManualFoods(updated);
  };

  const handleDone = () => {
    navigate('/');
  };

  const handleRetake = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setNeedsClarification(false);
    setClarificationOptions([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Manual entry mode
  if (isManualMode) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Add Meal</h1>
        </div>

        <div className="container">
          {!result ? (
            <>
              <p className="text-muted mb-2">Enter what you ate:</p>

              {manualFoods.map((food, index) => (
                <div key={index} className="card mb-2" style={{ padding: '12px' }}>
                  <input
                    type="text"
                    className="input mb-1"
                    placeholder="Food name (e.g., Chicken Salad)"
                    value={food.name}
                    onChange={(e) => updateManualFood(index, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Ingredients (comma separated)"
                    value={food.ingredients}
                    onChange={(e) => updateManualFood(index, 'ingredients', e.target.value)}
                  />
                </div>
              ))}

              <button
                className="btn btn-outline mb-2"
                onClick={addManualFood}
                style={{ width: '100%' }}
              >
                + Add Another Food
              </button>

              <button
                className="btn btn-primary"
                onClick={handleManualSubmit}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Saving...' : 'Save Meal'}
              </button>

              <button
                className="btn btn-outline mt-2"
                onClick={() => navigate('/')}
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="card">
                <h3 style={{ margin: '0 0 16px 0' }}>Food Logged!</h3>
                {result.foods?.map((food, index) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>{food.name}</p>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary mt-2" onClick={handleDone}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Photo mode
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Log Meal</h1>
      </div>

      <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <input
          type="file"
          id="meal-photo-input"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />

        {!preview ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '80px', gap: '16px' }}>
            <label
              htmlFor="meal-photo-input"
              className="btn btn-primary"
              style={{
                padding: '18px 28px',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '24px' }}>📷</span>
              Tap to Take Photo
            </label>
            <p style={{ fontSize: '14px', color: '#7A5A44', margin: 0 }}>No calorie counting. No judgment.</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img
                src={preview}
                alt="Meal preview"
                style={{
                  width: '100%',
                  maxHeight: '45vh',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </div>

            {!result && !loading && (
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '16px',
                position: 'sticky',
                bottom: '80px',
                background: '#FFF3E3',
                padding: '12px 0',
                zIndex: 10
              }}>
                <button className="btn btn-outline" onClick={handleRetake}>
                  Retake
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Analyze
                </button>
              </div>
            )}

            {loading && (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Analyzing your meal...</p>
              </div>
            )}

            {result && (
              <>
                <div className="card mt-2">
                  <h3 style={{ margin: '0 0 16px 0' }}>Food Logged!</h3>
                  {result.foods?.map((food, index) => (
                    <div key={index} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: index < result.foods.length - 1 ? '1px solid #E8D9C8' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#4A2E1F' }}>{food.name}</p>
                        {food.confidence && food.confidence < 0.7 && (
                          <span style={{
                            background: '#F5ECDB',
                            color: '#B87A2E',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            Uncertain
                          </span>
                        )}
                      </div>
                      {food.ingredients && (
                        <p style={{ margin: '0', fontSize: '14px', color: '#7A5A44' }}>
                          {Array.isArray(food.ingredients) ? food.ingredients.join(', ') : food.ingredients}
                        </p>
                      )}
                      {food.restaurant && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#7A5A44' }}>
                          📍 {food.restaurant}
                        </p>
                      )}

                      {/* Clarification options for uncertain items */}
                      {needsClarification && food.confidence && food.confidence < 0.7 && food.alternatives && (
                        <div style={{ marginTop: '8px' }}>
                          <p style={{ fontSize: '12px', color: '#7A5A44', margin: '0 0 8px 0' }}>
                            Did you mean:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {food.alternatives.map((alt, altIdx) => (
                              <button
                                key={altIdx}
                                className="btn btn-outline"
                                style={{ padding: '4px 12px', fontSize: '14px' }}
                                onClick={() => handleClarification(index, alt)}
                              >
                                {alt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button className="btn btn-secondary mt-2" onClick={handleDone}>
                  Done
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LogMeal;
