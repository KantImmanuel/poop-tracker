import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function LogMeal() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await api.post('/meals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
    } catch (error) {
      console.error('Failed to upload meal:', error);
      alert('Failed to analyze meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    navigate('/');
  };

  const handleRetake = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    fileInputRef.current.value = '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Log Meal</h1>
      </div>

      <div className="container">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />

        {!preview ? (
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current.click()}
            style={{ padding: '48px 32px' }}
          >
            <span style={{ fontSize: '48px' }}>📷</span>
            Take Photo
          </button>
        ) : (
          <>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img
                src={preview}
                alt="Meal preview"
                style={{ width: '100%', display: 'block' }}
              />
            </div>

            {!result && !loading && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
                  <h3 style={{ margin: '0 0 16px 0' }}>Detected Foods</h3>
                  {result.foods?.map((food, index) => (
                    <div key={index} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: index < result.foods.length - 1 ? '1px solid #eee' : 'none' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{food.name}</p>
                      {food.ingredients && (
                        <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                          {food.ingredients.join(', ')}
                        </p>
                      )}
                      {food.restaurant && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#999' }}>
                          📍 {food.restaurant}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary mt-2" onClick={handleDone}>
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
