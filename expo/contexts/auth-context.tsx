import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { API_BASE_URL } from "@/lib/config"

const STORAGE_KEY = "technode_customer_session"

type CustomerUser = {
  customerId: number
  email: string | null
  customerRepresentative: string | null
}

type AuthContextType = {
  user: CustomerUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!raw) {
          return
        }

        const parsed = JSON.parse(raw) as CustomerUser
        if (typeof parsed.customerId === "number") {
          setUser(parsed)
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    }

    void restoreSession()
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      signIn: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/customer-login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          })

          const data = (await response.json()) as {
            error?: string
            customer?: CustomerUser
          }

          if (!response.ok || !data.customer) {
            return {
              ok: false,
              error: data.error ?? "Login failed",
            }
          }

          setUser(data.customer)
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.customer))
          return { ok: true }
        } catch {
          return {
            ok: false,
            error: "Unable to connect to technode-vps.vercel.app",
          }
        }
      },
      signOut: async () => {
        setUser(null)
        await AsyncStorage.removeItem(STORAGE_KEY)
      },
    }),
    [loading, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
