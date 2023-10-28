import React, { useEffect, useState } from 'react';
import axios from 'axios';
import QRCode from 'qrcode.react';
import './App.css';
import { DEFAULT_CAST, LOCAL_STORAGE_KEYS } from './constants';
import { NeynarService } from './NeynarService'; // Import the Neynar Service

interface FarcasterUser {
  signer_uuid: string;
  public_key: string;
  status: string;
  signer_approval_url?: string;
  fid?: number;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(null);
  const [text, setText] = useState<string>('');
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.FARCASTER_USER);
    if (storedData) {
      const user: FarcasterUser = JSON.parse(storedData);
      setFarcasterUser(user);
    }
  }, []);

  useEffect(() => {
    if (farcasterUser && farcasterUser.status === 'pending_approval') {
      let intervalId: NodeJS.Timeout;

      const startPolling = () => {
        intervalId = setInterval(async () => {
          try {
            const response = await axios.get(
              `/api/signer?signer_uuid=${farcasterUser?.signer_uuid}`,
            );
            const user = response.data as FarcasterUser;

            if (user?.status === 'approved') {
              // store the user in local storage
              localStorage.setItem(
                LOCAL_STORAGE_KEYS.FARCASTER_USER,
                JSON.stringify(user),
              );

              setFarcasterUser(user);
              clearInterval(intervalId);
            }
          } catch (error) {
            console.error('Error during polling', error);
          }
        }, 2000);
      };

      const stopPolling = () => {
        clearInterval(intervalId);
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          stopPolling();
        } else {
          startPolling();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Start the polling when the effect runs.
      startPolling();

      // Cleanup function to remove the event listener and clear interval.
      return () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
        clearInterval(intervalId);
      };
    }
  }, [farcasterUser]);

  const handleCast = async () => {
    setIsCasting(true);
    const castText = text.length === 0 ? DEFAULT_CAST : text;
    try {
      const response = await axios.post('/api/cast', {
        text: castText,
        signer_uuid: farcasterUser?.signer_uuid,
      });
      console.log('response', response);
      if (response.status === 200) {
        setText(''); // Clear the text field
        displayToast(); // Show the toast
      }
    } catch (error) {
      console.error('Could not send the cast', error);
    } finally {
      setIsCasting(false); // Re-enable the button
    }
  };
  const handleFollowUsers = async () => {
    console.log("Follow Users button clicked");
  
    try {
      // Replace with the actual targetFids array you want to follow
      const targetFids = [12345, 67890, 11223];
      console.log(`Attempting to follow ${targetFids.length} users`);
  
      // Make an API request to your server
      const response = await axios.post('/api/follow-users', { 
        signer_uuid: farcasterUser?.signer_uuid, 
        targetFids 
      });
  
      if (response.status === 200) {
        console.log("Finished following users");
      }
    } catch (error) {
      console.error('Error following users', error);
    }
  };
  
  const displayToast = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };
  const createAndStoreSigner = async () => {
    try {
      const response = await axios.post('/api/signer');
      if (response.status === 200) {
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.FARCASTER_USER,
          JSON.stringify(response.data),
        );
        setFarcasterUser(response.data);
      }
    } catch (error) {
      console.error('API Call failed', error);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  };

  return (
    <div className="App">
      {!farcasterUser?.status && (
        <button
          style={{
            backgroundColor: 'purple',
            color: 'white',
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Sign in with farcaster'}
        </button>
      )}

      {farcasterUser?.status == 'pending_approval' && farcasterUser?.signer_approval_url && (
        <div className="signer-approval-container">
          <QRCode value={farcasterUser.signer_approval_url} />
          <div className="or-divider">OR</div>
          <a href={farcasterUser.signer_approval_url} target="_blank" rel="noopener noreferrer">
            Click here to view the signer URL
          </a>
        </div>
      )}

      {farcasterUser?.status == 'approved' && (
        <div>
          <div className="user-info">
            {`You are logged in as fid ${farcasterUser.fid}`}
          </div>
          <div className="cast-container">
            <textarea
              className="cast-textarea"
              placeholder={DEFAULT_CAST}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
            />
            <button
              className="cast-button"
              style={{
                backgroundColor: 'purple',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: isCasting ? 'not-allowed' : 'pointer',
              }}
              onClick={handleCast}
              disabled={isCasting}
            >
              {isCasting ? <span>🔄</span> : 'Cast'}
            </button>
            {showToast && <div className="toast">Cast published</div>}
            <button onClick={handleFollowUsers}>Follow Users from Sheet</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;