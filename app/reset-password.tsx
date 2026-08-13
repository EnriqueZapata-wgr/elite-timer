/**
 * Reset de contraseña — el flujo vivo es forgot-password + página web
 * somosatp.com/reset-password (auth-context, task #43). Redirect (OLA0 QW-6).
 */
import { Redirect } from 'expo-router';
export default function ResetPasswordRedirect() { return <Redirect href="/forgot-password" />; }
