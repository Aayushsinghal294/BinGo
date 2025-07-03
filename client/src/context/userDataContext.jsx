import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
const SERVER_URL = import.meta.env.VITE_SERVER_URL
const API_URL = `${SERVER_URL}/api/missions`

const UserDataContext = createContext();

export const UserDataProvider = ({ children }) => {
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from backend
  const fetchUserData = useCallback(async () => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/${user.id}`);
      const data = await res.json();
      console.log(data)
      setUserData(data);
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