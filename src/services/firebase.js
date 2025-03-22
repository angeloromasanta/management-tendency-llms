import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection references
const DISCUSSIONS_COLLECTION = 'management-inclination-discussions';
const LEADERBOARD_COLLECTION = 'management-inclination-leaderboard';

// Get leaderboard data
export const getLeaderboardData = async () => {
  try {
    const leaderboardRef = doc(db, LEADERBOARD_COLLECTION, 'leaderboard');
    const docSnap = await getDoc(leaderboardRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }

    // Initialize leaderboard if it doesn't exist
    const initialData = {
      dimensions: {},
      lastUpdated: new Date(),
    };

    await setDoc(leaderboardRef, initialData);
    return initialData;
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    throw error;
  }
};

// Get recent discussions
// Get recent discussions
export const getRecentDiscussions = async (limitCount = 5) => {
  try {
    const discussionsRef = collection(db, DISCUSSIONS_COLLECTION);
    const q = query(discussionsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting recent discussions:', error);
    throw error;
  }
};

// Get all discussions
export const getDiscussions = async () => {
  try {
    const discussionsRef = collection(db, DISCUSSIONS_COLLECTION);
    const querySnapshot = await getDocs(discussionsRef);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting all discussions:', error);
    throw error;
  }
};

// Get a single discussion
export const getDiscussion = async (discussionId) => {
  try {
    const docRef = doc(db, DISCUSSIONS_COLLECTION, discussionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting discussion:', error);
    throw error;
  }
};

// Create a new discussion
export const createDiscussion = async (discussionData) => {
  try {
    const docRef = await addDoc(
      collection(db, DISCUSSIONS_COLLECTION),
      discussionData
    );
    return docRef.id;
  } catch (error) {
    console.error('Error creating discussion:', error);
    throw error;
  }
};

// Update a discussion
export const updateDiscussion = async (discussionId, updateData) => {
  try {
    const docRef = doc(db, DISCUSSIONS_COLLECTION, discussionId);
    await updateDoc(docRef, {
      ...updateData,
      lastUpdated: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error updating discussion:', error);
    throw error;
  }
};

// Update leaderboard with discussion results
// Update leaderboard with discussion results
export const updateLeaderboard = async (dimensionId, dimensionData, modelResults) => {
  try {
    const leaderboardRef = doc(db, LEADERBOARD_COLLECTION, 'leaderboard');
    const leaderboardSnap = await getDoc(leaderboardRef);
    
    if (!leaderboardSnap.exists()) {
      // Initialize leaderboard if it doesn't exist
      const initialData = {
        dimensions: {
          [dimensionId]: {
            ...dimensionData,
            models: modelResults,
            discussionCount: 1
          }
        },
        lastUpdated: new Date()
      };
      
      await setDoc(leaderboardRef, initialData);
      return true;
    }
    
    // Update existing leaderboard
    const currentData = leaderboardSnap.data();
    const currentDimension = currentData.dimensions[dimensionId] || {
      ...dimensionData,
      models: {},
      discussionCount: 0
    };
    
    // Update model stats for this dimension
    const updatedModels = { ...currentDimension.models };
    
    Object.entries(modelResults).forEach(([modelId, modelData]) => {
      const baseModelId = modelData.baseModelId;
      
      // Calculate balance based on vote (0 for A, 100 for B, 50 for Neutral)
      const currentVoteBalance = modelData.vote === 'A' ? 0 : modelData.vote === 'B' ? 100 : 50;
      
      if (updatedModels[modelId]) {
        // If model already exists in this dimension, calculate the new average balance
        // Get previous discussions count for this model
        const previousCount = updatedModels[modelId].discussionCount || 1;
        const previousBalance = updatedModels[modelId].balance || 50;
        
        // Calculate new average balance
        const newBalance = ((previousBalance * previousCount) + currentVoteBalance) / (previousCount + 1);
        
        updatedModels[modelId] = {
          ...updatedModels[modelId],
          balance: newBalance,
          recentVote: modelData.vote,
          discussionCount: previousCount + 1
        };
      } else {
        // Add new model data with the balance from current vote
        updatedModels[modelId] = {
          ...modelData,
          balance: currentVoteBalance,
          discussionCount: 1
        };
      }
    });
    
    // Update the dimension
    const updatedDimension = {
      ...dimensionData,
      models: updatedModels,
      discussionCount: currentDimension.discussionCount + 1
    };
    
    // Update the leaderboard
    await updateDoc(leaderboardRef, {
      [`dimensions.${dimensionId}`]: updatedDimension,
      lastUpdated: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    throw error;
  }
};

export default db;
