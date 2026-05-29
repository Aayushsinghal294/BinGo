import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
const SERVER_URL = import.meta.env.VITE_SERVER_URL
const API_URL = `${SERVER_URL}/api/missions`

const UserDataContext = createContext();

export const UserDataProvider = ({ children }) => {
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Fetch user data from backend
  const fetchUserData = useCallback(async () => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const maxRetries = 3;
      let attempt = 0;
      let data = null;

      while (attempt < maxRetries) {
        const res = await fetch(`${API_URL}/user/${user.id}`);

        if (res.status === 404) {
          // Ensure a user document exists before attempting mission fetch.
          const upsertRes = await fetch(`${API_URL}/user/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress,
              name: user.fullName || user.username || 'BinGo User',
              profileImage: user.imageUrl || ''
            })
          });

          if (!upsertRes.ok) {
            throw new Error('Failed to create user profile');
          }

          await wait(300);
          attempt += 1;
          continue;
        }

        if (!res.ok) {
          attempt += 1;
          if (attempt >= maxRetries) {
            throw new Error(`Failed to fetch user data (${res.status})`);
          }
          await wait(500);
          continue;
        }

        const parsed = await res.json();
        if (parsed?.error) {
          attempt += 1;
          if (attempt >= maxRetries) {
            throw new Error(parsed.error);
          }
          await wait(500);
          continue;
        }

        data = parsed;
        break;
      }

      if (data) {
        setUserData(data);
      } else {
        setUserData(null);
      }
    } catch (err) {
      setUserData(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return (
    <UserDataContext.Provider value={{ userData, setUserData, loading, refreshUserData: fetchUserData }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => useContext(UserDataContext);