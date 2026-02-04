import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { offlinePost } from '../services/api';
import { saveGuestMeal } from '../services/guestStorage';
import { trackEvent } from '../services/analytics';

function getDefaultMealTime() {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 16) return 'lunch';
  return 'dinner';
}

function getTodayDate() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function buildTimestamp(dateStr, mealTime) {
  const hours = mealTime === 'morning' ? 8 : mealTime === 'lunch' ? 12 : 18;
  const d = new Date(dateStr + 'T' + String(hours).padStart(2, '0') + ':00:00');
  return d.toISOString();
}

function LogMeal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest } = useAuth();

  // Get image passed from Home page (legacy support)
  const capturedImage = location.state?.capturedImage;

  // Tab state
  const [activeTab, setActiveTab] = useState('photo');

  // Shared date/time state
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [mealTime, setMealTime] = useState(getDefaultMealTime());

  // Photo state
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(capturedImage || null);
  const [preview, setPreview] = useState(capturedImage ? URL.createObjectURL(capturedImage) : null);

  // Manual state
  const [description, setDescription] = useState('');

  // Shared state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Clarification state
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationOptions, setClarificationOptions] = useState([]);
  const [pendingMealId, setPendingMealId] = useState(null);

  // Concealed food ingredient confirmation state
  const [ingredientSelections, setIngredientSelections] = useState({});
  const [confirmedFoods, setConfirmedFoods] = useState(new Set());
  const [guestFoodsPendingSave, setGuestFoodsPendingSave] = useState(null);

  // Auto-submit when image is passed from Home (legacy)
  useEffect(() => {
    if (capturedImage && !result && !loading) {
      handlePhotoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setNeedsClarification(false);
    }
  };

  const handlePhotoSubmit = async () => {
    if (!image) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', image);

      if (isGuest) {
        const response = await api.post('/meals/analyze-guest', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const aiResult = response.data;
        const hasConcealed = (aiResult.foods || []).some(f => f.isConcealed);

        if (hasConcealed) {
          initIngredientSelections(aiResult.foods);
          const foods = (aiResult.foods || []).map(f => ({
            name: f.name,
            ingredients: Array.isArray(f.ingredients) ? f.ingredients : []
          }));
          setGuestFoodsPendingSave(foods);
        } else {
          const foods = (aiResult.foods || []).map(f => ({
            name: f.name,
            ingredients: Array.isArray(f.ingredients) ? f.ingredients : []
          }));
          await saveGuestMeal(foods);
        }
        setResult(aiResult);
        trackEvent('meal_logged');
      } else {
        const response = await offlinePost('/meals', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.offline) {
          setResult({
            offline: true,
            foods: [{ name: 'Meal saved offline', category: 'Pending sync' }],
            notes: 'This meal will be analyzed when you\'re back online'
          });
          trackEvent('meal_logged');
          return;
        }

        const hasConcealed = (response.data.foods || []).some(f => f.isConcealed);
        if (hasConcealed) {
          initIngredientSelections(response.data.foods);
          setPendingMealId(response.data.id);
        }

        const lowConfidenceFoods = response.data.foods?.filter(f => f.confidence && f.confidence < 0.7);
        if (lowConfidenceFoods?.length > 0 && response.data.clarificationOptions) {
          setNeedsClarification(true);
          setClarificationOptions(response.data.clarificationOptions);
          setPendingMealId(response.data.id);
          setResult(response.data);
        } else {
          setResult(response.data);
        }
        trackEvent('meal_logged');
      }
    } catch (error) {
      console.error('Failed to upload meal:', error);
      alert('Failed to analyze meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!description.trim()) {
      alert('Please describe what you ate');
      return;
    }

    setLoading(true);
    try {
      const timestamp = buildTimestamp(selectedDate, mealTime);

      if (isGuest) {
        // For guests, we can't call the AI endpoint without auth
        // Save as a simple food entry
        const foods = [{ name: description.trim(), ingredients: [] }];
        await saveGuestMeal(foods);
        setResult({ foods });
        trackEvent('meal_logged');
      } else {
        const response = await offlinePost('/meals/manual', {
          description: description.trim(),
          timestamp,
          mealType: mealTime
        });

        if (response.data.offline) {
          setResult({
            offline: true,
            foods: [{ name: description.trim(), ingredients: [] }],
            notes: 'Saved offline — will be analyzed when connected'
          });
        } else {
          setResult(response.data);
        }
        trackEvent('meal_logged');
      }
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert('Failed to log meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClarification = async (foodIndex, selectedOption) => {
    try {
      await api.put(`/meals/${pendingMealId}/clarify`, {
        foodIndex,
        correctedName: selectedOption
      });

      const updatedFoods = [...result.foods];
      updatedFoods[foodIndex].name = selectedOption;
      updatedFoods[foodIndex].confidence = 1.0;
      setResult({ ...result, foods: updatedFoods });

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

  // Concealed food helpers
  const initIngredientSelections = (foods) => {
    const selections = {};
    (foods || []).forEach((food, idx) => {
      if (food.isConcealed) {
        const confirmed = Array.isArray(food.confirmedIngredients) ? food.confirmedIngredients : [];
        selections[idx] = new Set(confirmed);
      }
    });
    setIngredientSelections(selections);
    setConfirmedFoods(new Set());
  };

  const toggleIngredient = (foodIndex, ingredient) => {
    setIngredientSelections(prev => {
      const current = new Set(prev[foodIndex] || []);
      if (current.has(ingredient)) {
        current.delete(ingredient);
      } else {
        current.add(ingredient);
      }
      return { ...prev, [foodIndex]: current };
    });
  };

  const handleConfirmIngredients = async (foodIndex) => {
    const selectedIngredients = Array.from(ingredientSelections[foodIndex] || []);

    const updatedFoods = [...result.foods];
    updatedFoods[foodIndex] = {
      ...updatedFoods[foodIndex],
      ingredients: selectedIngredients
    };
    setResult({ ...result, foods: updatedFoods });

    setConfirmedFoods(prev => new Set([...prev, foodIndex]));

    if (!isGuest && pendingMealId) {
      try {
        await api.put(`/meals/${pendingMealId}/ingredients`, {
          foods: [{ foodIndex, ingredients: selectedIngredients }]
        });
      } catch (error) {
        console.error('Failed to update ingredients:', error);
      }
    }

    if (isGuest && guestFoodsPendingSave) {
      const allConcealed = (result.foods || [])
        .map((f, i) => f.isConcealed ? i : null)
        .filter(i => i !== null);
      const newConfirmed = new Set([...confirmedFoods, foodIndex]);
      const allDone = allConcealed.every(i => newConfirmed.has(i));

      if (allDone) {
        const finalFoods = updatedFoods.map(f => ({
          name: f.name,
          ingredients: Array.isArray(f.ingredients) ? f.ingredients : []
        }));
        await saveGuestMeal(finalFoods);
        setGuestFoodsPendingSave(null);
      }
    }
  };

  const handleDone = () => {
    navigate('/');
  };

  const handleAddAnother = () => {
    setActiveTab('photo');
    setImage(null);
    setPreview(null);
    setDescription('');
    setResult(null);
    setLoading(false);
    setNeedsClarification(false);
    setClarificationOptions([]);
    setPendingMealId(null);
    setIngredientSelections({});
    setConfirmedFoods(new Set());
    setGuestFoodsPendingSave(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRetake = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setNeedsClarification(false);
    setClarificationOptions([]);
    setIngredientSelections({});
    setConfirmedFoods(new Set());
    setGuestFoodsPendingSave(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Result display — shared between photo and manual
  const renderResult = () => {
    if (!result) return null;

    const concealedIndices = (result.foods || [])
      .map((f, i) => f.isConcealed ? i : null)
      .filter(i => i !== null);
    const allConcealedConfirmed = concealedIndices.length === 0 ||
      concealedIndices.every(i => confirmedFoods.has(i));

    return (
      <>
        <div className="card mt-2">
          <h3 style={{ margin: '0 0 16px 0' }}>Meal Logged!</h3>
          {result.foods?.map((food, index) => {
            const isConcealed = food.isConcealed && !confirmedFoods.has(index);
            const allIngredients = [
              ...(Array.isArray(food.confirmedIngredients) ? food.confirmedIngredients : []),
              ...(Array.isArray(food.possibleIngredients) ? food.possibleIngredients : [])
            ];
            const selections = ingredientSelections[index];

            return (
              <div key={index} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: index < result.foods.length - 1 ? '1px solid #E8D9C8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#4A2E1F' }}>{food.name}</p>
                  {food.confidence && food.confidence < 0.7 && !food.isConcealed && (
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
                  {food.isConcealed && !confirmedFoods.has(index) && (
                    <span style={{
                      background: '#E5EDE5',
                      color: '#5A8A60',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      Confirm ingredients
                    </span>
                  )}
                </div>

                {/* Ingredient chips for concealed foods */}
                {isConcealed && selections && (
                  <>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7A5A44' }}>
                      We can't see inside — tap to select what's in it:
                    </p>
                    <div className="symptom-chips">
                      {allIngredients.map(ingredient => (
                        <button
                          key={ingredient}
                          className={`symptom-chip${selections.has(ingredient) ? ' active' : ''}`}
                          onClick={() => toggleIngredient(index, ingredient)}
                        >
                          {ingredient}
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '12px', height: '44px', fontSize: '15px', borderRadius: '14px', width: '100%' }}
                      onClick={() => handleConfirmIngredients(index)}
                    >
                      Confirm Ingredients
                    </button>
                  </>
                )}

                {/* Confirmed concealed food — show final ingredients */}
                {food.isConcealed && confirmedFoods.has(index) && food.ingredients && (
                  <p style={{ margin: '0', fontSize: '14px', color: '#7A5A44' }}>
                    {Array.isArray(food.ingredients) ? food.ingredients.join(', ') : food.ingredients}
                  </p>
                )}

                {/* Non-concealed food — show ingredients */}
                {!food.isConcealed && food.ingredients && (
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
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={handleAddAnother}
          >
            + Add Another Meal
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleDone}
            disabled={!allConcealedConfirmed}
          >
            Done
          </button>
        </div>
      </>
    );
  };

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

        {/* Landing — two buttons */}
        {activeTab === 'photo' && !preview && !result && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '80px', gap: '16px' }}>
            <label
              htmlFor="meal-photo-input"
              className="btn btn-primary"
              style={{ cursor: 'pointer' }}
            >
              <span style={{ fontSize: '24px' }}>📷</span>
              Tap to Take Photo
            </label>
            <button
              className="btn btn-outline"
              onClick={() => setActiveTab('manual')}
            >
              Log Manually
            </button>
          </div>
        )}

        {/* Photo preview + analysis */}
        {activeTab === 'photo' && preview && (
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
                <button className="btn btn-primary" onClick={handlePhotoSubmit}>
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

            {renderResult()}
          </>
        )}

        {/* Manual entry */}
        {activeTab === 'manual' && (
          <>
            {!result ? (
              <>
                {/* Date & Meal Time — manual tab only */}
                <div style={{ marginBottom: '16px', overflow: 'hidden' }}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '14px' }}>Date</label>
                    <input
                      type="date"
                      className="input"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={getTodayDate()}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#4A2E1F', fontSize: '14px' }}>Meal Time</label>
                    <div className="symptom-chips">
                      {[
                        { val: 'morning', label: 'Morning' },
                        { val: 'lunch', label: 'Lunch' },
                        { val: 'dinner', label: 'Dinner' },
                      ].map(t => (
                        <button
                          key={t.val}
                          className={`symptom-chip${mealTime === t.val ? ' active' : ''}`}
                          onClick={() => setMealTime(t.val)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <textarea
                    className="input"
                    placeholder="Describe what you ate (e.g., chicken tikka masala with garlic naan and a side of rice)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                </div>

                <button
                  className="btn btn-primary mt-2"
                  onClick={handleManualSubmit}
                  disabled={loading || !description.trim()}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>

                {loading && (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Analyzing your meal...</p>
                  </div>
                )}

                <button
                  className="btn btn-outline mt-2"
                  onClick={() => navigate('/')}
                  style={{ width: '100%' }}
                >
                  Cancel
                </button>
              </>
            ) : (
              renderResult()
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LogMeal;
