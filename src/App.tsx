import React, { useEffect, useState } from 'react';
import axios from 'axios';
import QRCode from 'qrcode.react';
import './App.css';
import { LOCAL_STORAGE_KEYS } from './constants';

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

  const handleFollowUsers = async () => {
    console.log("Follow Users button clicked");
  
    try {
      // Replace with the actual targetFids array you want to follow
      const targetFids = await getFarcasterFIDs();
      console.log(`Attempting to follow ${targetFids.length} users`);
  
      // Make an API request to your server
      const response = await axios.post('/api/follow-users', { 
        signer_uuid: farcasterUser?.signer_uuid, 
        target_fids: targetFids 
      });
  
      if (response.status === 200) {
        console.log("Finished following users");
      }
    } catch (error) {
      console.error('Error following users', error);
    }
  };
  const fetchFidFromUsername = async (username: string): Promise<string | null> => {
    const apiKey = process.env.REACT_APP_NEYNAR_API_KEY;
    const viewerFid = process.env.FARCASTER_DEVELOPER_FID; // If needed, adjust this as well
    const trimmedUsername = username.trim().replace(/^"|"$/g, '');

    const options = {
      method: 'GET',
      url: `https://api.neynar.com/v1/farcaster/user-by-username?username=${trimmedUsername}&viewerFid=${viewerFid}`, 
      headers: {
        accept: 'application/json',
        api_key: apiKey
      }
    };
  
    try {
      const response = await axios.request(options);
      if (response.data && response.data.result && response.data.result.user) {
        return response.data.result.user.fid;
      }
      throw new Error('User not found');
    } catch (error) {
      console.error("Error fetching fid: ", error);
      return null;
    }
  };
  
  const getFarcasterFIDs = async () => {
    const spreadsheetId = '1CUCgxhy1OnJzU_kwLy15T_NQHTaui8phxASpy_YYnq0';
    const range = 'Sheet1!C:D'; // Adjusted to fetch data from third (C) and fourth (D) columns
  
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=${range}`;
  
    try {
      const response = await axios.get(url);
      const data = response.data;
  
      // Process the CSV data to extract usernames and FIDs
      const lines = data.split('\n').slice(1).filter(Boolean); // Split by newline, remove header, and filter out empty values
      const fids = [];
  
      for (const line of lines) {
        console.log(`Processing line: ${line}`);
        const [username, fid] = line.split(',').map((s: string) => s.trim());
        if (fid && !isNaN(Number(fid))) {
          fids.push(fid);
        } else if (username) {
          const fetchedFid = await fetchFidFromUsername(username);
          if (fetchedFid) {
            fids.push(fetchedFid);
          } else {
            console.error(`Failed to fetch FID for username: ${username}`);
          }
        }
      }
  
      return fids;
    } catch (error) {
      console.error('Error fetching data from Google Spreadsheet:', error);
      return [];
    }
  };
  
  getFarcasterFIDs().then(fids => {
    console.log('Farcaster FIDs:', fids);
    // You can now use these FIDs for your follow-users function
  });
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
  async function handleSignIn() {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }
  return (
  <div className="App">
      <h1>Alliance Farcaster Follow</h1> {/* Updated Header */}
      <p>
        Please add your farcaster name and/or id to the spreadsheet 
        <a href="https://docs.google.com/spreadsheets/d/1CUCgxhy1OnJzU_kwLy15T_NQHTaui8phxASpy_YYnq0/edit#gid=204458638" target="_blank" rel="noopener noreferrer"> here</a>.
      </p>

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
          <QRCode className="qr-code" value={farcasterUser.signer_approval_url} />
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
          <button className="follow-button" onClick={handleFollowUsers}>Follow Users from Sheet</button>
        </div>
      )}
    </div>
  );
}

export default App;