import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/Exercise.css';

const cache = new Map(); // ✅ Cache to store exercise data

const Exercise = () => {
  const { id } = useParams();
  const [exercise, setExercise] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);

  useEffect(() => {
    if (id) {
      fetchData(id);
    }
  }, [id]);

  // Utility function to add delay (for API retries)
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ✅ Fetch Exercise Data with Caching and Exponential Backoff
  const fetchData = async (id, retries = 3) => {
    // ✅ Check if data exists in cache
    if (cache.has(id)) {
      console.log(`Using cached data for: ${id}`);
      setExercise(cache.get(id));
      return;
    }

    const options = {
      method: 'GET',
      url: `https://exercisedb.p.rapidapi.com/exercises/exercise/${id}`,
      headers: {
        'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.REACT_APP_RAPIDAPI_HOST,
      },
    };

    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.request(options);
        console.log(response.data);
        setExercise(response.data);

        // ✅ Store data in cache
        cache.set(id, response.data);

        // ✅ Fetch related videos after getting exercise data
        await fetchRelatedVideos(response.data.name);
        return;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);

        if (error.response?.status === 429) {
          console.warn(`Rate limit hit. Retrying in ${2000 * (i + 1)}ms...`);
          await delay(2000 * (i + 1)); // Exponential backoff delay
        } else if (error.response?.status === 401) {
          console.error('Unauthorized request. Check your API key.');
          break;
        } else {
          console.error(`API Error: ${error.response?.status || 'Unknown Error'}`);
          break;
        }
      }
    }
  };

  // ✅ Fetch Related YouTube Videos
  const fetchRelatedVideos = async (name) => {
    console.log(`Fetching related videos for: ${name}`);

    const options = {
      method: 'GET',
      url: 'https://youtube-search-and-download.p.rapidapi.com/search',
      params: {
        q: name, // ✅ Add search query parameter
        type: 'video', // ✅ Filter to only videos (optional)
        part: 'snippet',
        maxResults: 10, // ✅ Limit the results
      },
      headers: {
        'X-RapidAPI-Key': process.env.REACT_APP_YOUTUBE_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com',
      },
    };

    try {
      const response = await axios.request(options);
      console.log('Related Videos:', response.data.contents);
      setRelatedVideos(response.data.contents || []); // ✅ Fallback to empty array
    } catch (error) {
      console.error('Error fetching related videos:', error);
    }
  };

  return (
    <div className="exercise-page">
      {exercise && (
        <div className="exercise-container">
          <div className="exercise-image">
            <img src={exercise.gifUrl} alt="exercise img" />
          </div>

          <div className="exercise-data">
            <h3>{exercise.name}</h3>
            <span>
              <b>Target:</b>
              <p>{exercise.target}</p>
            </span>
            <span>
              <b>Equipment:</b>
              <p>{exercise.equipment}</p>
            </span>
            <span>
              <b>Secondary Muscles:</b>
              <ul>
                {exercise.secondaryMuscles?.map((muscle, index) => (
                  <li key={index}>{muscle}</li>
                ))}
              </ul>
            </span>
            <div className="exercise-instructions">
              <h3>Instructions</h3>
              {exercise.instructions?.map((instruction, index) => (
                <ul key={index}>
                  <li>{instruction}</li>
                </ul>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Related Videos Section */}
      <div className="related-videos-container">
        <h3>Related Videos on YouTube</h3>
        {relatedVideos.length > 0 && (
          <div className="related-videos">
            {relatedVideos.slice(0, 15).map((video, index) => (
              <div
                className="related-video"
                key={index}
                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.video.videoId}`, '_blank')}
              >
                <img src={video.video.thumbnails[0]?.url} alt="" />
                <h4>{video.video.title.slice(0, 40)}...</h4>
                <span>
                  <p>{video.video.channelName}</p>
                  <p>{video.video.viewCountText}</p>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Exercise;
