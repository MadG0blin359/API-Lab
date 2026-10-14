import { supabase, supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import { SignUpInput, SignInInput } from "../validators/auth.validator.js";

export const authService = {
  /**
   * Register a new user in Supabase Auth.
   */
  async signUp(input: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
        },
      },
    });

    if (error) {
      throw new AppError(400, error.message);
    }

    return data;
  },

  /**
   * Log in user using email and password.
   */
  async signIn(input: SignInInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new AppError(401, error.message);
    }

    return data;
  },

  /**
   * Sign out the user by revoking their token.
   */
  async signOut(accessToken: string) {
    // Admin sign out revokes the JWT session globally
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
    if (error) {
      // Fallback: standard signout
      await supabase.auth.signOut();
    }
    return true;
  },

  /**
   * Request password reset email.
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw new AppError(400, error.message);
    }
    return true;
  },
};

export default authService;
