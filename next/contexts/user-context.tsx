"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type UserData = {
  customerRepresentative: string
  email: string
  companyName: string
  companyLogoUrl: string
  companyIconUrl: string
}

type UserContextType = {
  user: UserData | null
  setUser: (value: UserData | null) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode
  initialUser?: UserData | null
}) {
  const [user, setUserState] = useState<UserData | null>(initialUser)

  const value = useMemo(
    () => ({
      user,
      setUser: setUserState,
      clearUser: () => setUserState(null),
    }),
    [user]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }

  return context
}
