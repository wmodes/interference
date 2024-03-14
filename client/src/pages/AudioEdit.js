// AudioEdit.js - Edit audio details

// TODO: Link back to List at top of form 

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioInfo, audioUpdate } from '../store/audioSlice';
import { initWaveSurfer, destroyWaveSurfer } from '../utils/waveUtils';
import { formatDateForDisplay, formatTagStrForDB, formatTagsForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const audioBaseURL = config.server.audioBaseURL;

function AudioEdit() {
  const { audioID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [isDomReady, setIsDomReady] = useState(false);
  const waveSurferRef = useRef(null);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // State for managing form inputs
  const [audioDetails, setAudioDetails] = useState({
    title: '',
    filename: '', // Assuming this is not editable but we're showing it
    status: '',
    classification: {
      ambient: false,
      background: false,
      foreground: false,
      spoken: false,
      music: false,
      effect: false,
      other: false,
    },
    tags: '',
    comments: '',
    // Non-editable details
    uploader_id: '',
    upload_date: '',
    duration: '',
    file_type: '',
    copyright_cert: 0,
  });

  useEffect(() => {
    if (!audioID || !isAuthenticated) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo(audioID))
      .unwrap()
      .then(response => {
        // Parse and transform the response as needed, similar to how it's done in UploadAudio
        setAudioDetails(prevState => ({
          ...prevState,
          ...response,
          tags: formatTagsForDisplay(response.tags),
          upload_date: formatDateForDisplay(response.upload_date),
          classification: response.classification.reduce((acc, curr) => ({
            ...acc,
            [curr]: true
          }), {...audioDetails.classification})
        }));
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(err => {
        console.error('Error fetching audio details:', err);
        setError('Failed to fetch audio details.');
        setIsLoading(false); // Stop loading on error
      });
  }, [audioID, dispatch, isAuthenticated]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle classification checkbox change
      setAudioDetails(prevState => ({
        ...prevState,
        classification: { ...prevState.classification, [name]: checked }
      }));
    } else {
      setAudioDetails(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Normalize tags before submitting
    const normalizedTags = formatTagStrForDB(audioDetails.tags);
    const updatedDetails = {
      ...audioDetails,
      tags: normalizedTags,
      classification: Object.keys(audioDetails.classification).filter(key => audioDetails.classification[key])
    };
    dispatch(audioUpdate({audioID, ...updatedDetails}))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        // Update audioDetails state with normalized tags to reflect in the input field
        setAudioDetails(prevDetails => ({
          ...prevDetails,
          // Convert array back to string for input field
          tags: formatTagsForDisplay(normalizedTags) 
        }));
      })
      .catch(err => {
        console.error('Update error:', err);
        setError('Failed to update audio.');
      });
  };

  // This useEffect ensures the component is mounted before initializing WaveSurfer
  useEffect(() => {
    setIsDomReady(true);
    // s('Component mounted');
  }, []);

  // initialize WaveSurfer once the component is mounted and audioDetails.filename is available
  useEffect(() => {  //
    if (isDomReady && audioDetails.filename) {
      const audioURL = `${audioBaseURL}/${audioDetails.filename}`;
      // check if waveSurferRef.current is already initialized
      if (waveSurferRef.current) {
        destroyWaveSurfer();
      }
      // Initialize a new WaveSurfer instance
      initWaveSurfer(audioURL, (wavesurfer) => {
        // console.log('WaveSurfer is ready:', wavesurfer);
      }).then(wavesurfer => {
        waveSurferRef.current = wavesurfer;
      });
    }
    // Cleanup function to destroy WaveSurfer instance on component unmount
    return () => {  //
      if (waveSurferRef.current) {
        destroyWaveSurfer();
      }
    };
  }, [isDomReady, audioDetails.filename]); 

  // Redirect to signin page if not authenticated
  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

  const Required = () => <span className="required">*</span>;

  const prepLabel = (text) => text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, match => match.toUpperCase())
    .trim();

  // Function to render advanced pagination buttons with navigation controls
  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/audio/list')}>
          <FeatherIcon icon="arrow-left" />List
        </span>
        <span className="link" onClick={() => navigate(`/audio/view/${audioID}`)}>
          View
        </span>
      </div>
    );
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Edit Audio</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title: <Required /></label>
              <input className="form-field" type="text" id="title" name="title" value={audioDetails.title} onChange={handleChange} />
              
              <div className="mb-2">
                <label className="form-label">Filename:</label> <span className="non-editable">{audioDetails.filename}</span>
              </div>

              <label className="form-label" htmlFor="status">Status:</label>
              <select name="status" value={audioDetails.status} onChange={handleChange} className="form-select">
                <option value="Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Disapproved">Disapproved</option>
                <option value="Trashed">Trashed</option>
              </select>
            </div>

            <div className="form-group">
              <div id="waveform"></div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">Classification:</label>
              <div className="form-checkbox">
                {Object.entries(audioDetails.classification).map(([key, value]) => (
                  <div key={key}>
                    <input
                      type="checkbox"
                      id={key}
                      name={key}
                      checked={value}
                      onChange={handleChange}
                    />
                    <label htmlFor={key}> {prepLabel(key)}</label>
                  </div>
                ))}
              </div>

              <label className="form-label" htmlFor="tags">Tags:</label>
              <input className="form-field" type="text" id="tags" name="tags" value={audioDetails.tags} onChange={handleChange} />
              <p className="form-note">Separated with commas</p>

              <label className="form-label" htmlFor="comments">Comments:</label>
              <textarea className="form-textarea" id="comments" name="comments" value={audioDetails.comments} onChange={handleChange}></textarea>
            </div>

            <div className='button-box'>
              <button className='button cancel' type="button" onClick={() => navigate('/audio/list')}>Cancel</button>
              <button className='button submit' type="submit">Save Changes</button>
            </div>

            <div className='message-box'>
              {successMessage && <p className="success">{successMessage}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </form>
          {renderBreadcrumbs()}
        </div>
      </div>
    </div>
  );
}

export default AudioEdit;