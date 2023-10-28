import axios from 'axios';

const BASE_URL = 'https://api.neynar.com/v2'; // Replace with the actual base URL of Neynar API
const API_KEY = process.env.REACT_APP_NEYNAR_API_KEY; // Make sure this environment variable is set

export const NeynarService = {
  /**
   * Follow a user on Neynar
   * @param signerUuid The UUID of the signer (must be approved)
   * @param targetFids Array of integers representing the FIDs of the target users to follow
   * @returns Response from the Neynar API
   */
  followUser: async (signerUuid: string, targetFids: number[]) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/farcaster/user/follow`,
        {
          signer_uuid: signerUuid,
          target_fids: targetFids,
          api_key: API_KEY,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Retrieve user information by username from Neynar
   * @param username The username of the user
   * @returns User data from the Neynar API
   */
  userByUsername: async (username: string) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/userByUsername`,
        { 
          params: { username: username, viewerFid: '3' },
          headers: { Authorization: `Bearer ${API_KEY}` } 
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add other methods as needed...
};

export default NeynarService;
