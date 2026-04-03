import { useState } from "react"
import { ActivityIndicator, Image, TextInput, View } from "react-native"
import { Redirect, useRouter } from "expo-router"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useAuth } from "@/contexts/auth-context"

export default function LoginScreen() {
  const router = useRouter()
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return <Redirect href="/(tabs)/home" />
  }

  async function onSubmit() {
    setError(null)

    if (!email.trim() || !password) {
      setError("Email and password are required")
      return
    }

    setLoading(true)
    const result = await signIn(email.trim(), password)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? "Login failed")
      return
    }

    router.replace("/(tabs)/home")
  }

  return (
    <View className="flex-1 justify-center bg-background px-5">
      <View className="rounded-2xl border border-border bg-card p-5">
        <Image
          source={require("@/assets/images/react-native-reusables-light.png")}
          style={{ width: 62, height: 62, alignSelf: "center" }}
          resizeMode="contain"
        />
        <Text className="mt-3 text-center text-2xl font-bold text-foreground">Technode VPS</Text>
        <Text className="mt-1 text-center text-muted-foreground">Customer login</Text>

        <View className="mt-5 gap-3">
          <View>
            <Text className="mb-1 text-sm text-foreground">Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              className="h-11 rounded-xl border border-border bg-background px-3 text-foreground"
              placeholder="you@company.com"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View>
            <Text className="mb-1 text-sm text-foreground">Password</Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="h-11 rounded-xl border border-border bg-background px-3 text-foreground"
              placeholder="Enter password"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {error ? <Text className="text-sm text-rose-500">{error}</Text> : null}

          <Button onPress={onSubmit} disabled={loading} className="h-11 rounded-xl">
            <View className="flex-row items-center justify-center">
              {loading ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} /> : null}
              <Text className="text-sm font-semibold text-primary-foreground">
                {loading ? "Signing in..." : "Continue"}
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  )
}
