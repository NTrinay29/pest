import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-7a1e5de8/health", (c) => {
  return c.json({ status: "ok" });
});

// Initialize admin user on first run
app.post("/make-server-7a1e5de8/init", async (c) => {
  try {
    const existingAdmin = await kv.get("user:admin@fertilizer.com");
    if (existingAdmin) {
      return c.json({ message: "Admin already exists" });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@fertilizer.com',
      password: 'admin123',
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating admin user: ${error.message}`);
      return c.json({ error: `Error creating admin user: ${error.message}` }, 500);
    }

    await kv.set("user:admin@fertilizer.com", {
      id: data.user.id,
      email: 'admin@fertilizer.com',
      role: 'admin',
      companyName: 'Admin'
    });

    return c.json({ message: "Admin user created", email: "admin@fertilizer.com", password: "admin123" });
  } catch (error) {
    console.log(`Error in init endpoint: ${error.message}`);
    return c.json({ error: `Error in init endpoint: ${error.message}` }, 500);
  }
});

// Sign up new company (admin only)
app.post("/make-server-7a1e5de8/signup", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const adminUser = await kv.get(`user:${user.email}`);
    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({ error: 'Only admin can create company accounts' }, 403);
    }

    const body = await c.req.json();
    const { email, password, companyName } = body;

    if (!email || !password || !companyName) {
      return c.json({ error: 'Email, password, and company name are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating company user: ${error.message}`);
      return c.json({ error: `Error creating company user: ${error.message}` }, 500);
    }

    await kv.set(`user:${email}`, {
      id: data.user.id,
      email,
      role: 'company',
      companyName
    });

    return c.json({ message: "Company created successfully", email, companyName });
  } catch (error) {
    console.log(`Error in signup endpoint: ${error.message}`);
    return c.json({ error: `Error in signup endpoint: ${error.message}` }, 500);
  }
});

// Sign in
app.post("/make-server-7a1e5de8/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Sign in error: ${error.message}`);
      return c.json({ error: `Sign in error: ${error.message}` }, 401);
    }

    const userProfile = await kv.get(`user:${email}`);

    return c.json({
      accessToken: data.session.access_token,
      user: userProfile
    });
  } catch (error) {
    console.log(`Error in signin endpoint: ${error.message}`);
    return c.json({ error: `Error in signin endpoint: ${error.message}` }, 500);
  }
});

// Get all companies (admin only)
app.get("/make-server-7a1e5de8/companies", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const adminUser = await kv.get(`user:${user.email}`);
    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const allUsers = await kv.getByPrefix("user:");
    const companies = allUsers.filter(u => u.role === 'company');

    return c.json({ companies });
  } catch (error) {
    console.log(`Error fetching companies: ${error.message}`);
    return c.json({ error: `Error fetching companies: ${error.message}` }, 500);
  }
});

// Submit a review
app.post("/make-server-7a1e5de8/reviews", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${user.email}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const body = await c.req.json();
    const { clientName, paymentBehavior, rating, notes } = body;

    if (!clientName || !paymentBehavior) {
      return c.json({ error: 'Client name and payment behavior are required' }, 400);
    }

    const reviewId = `review:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const review = {
      id: reviewId,
      companyName: userProfile.companyName,
      companyEmail: user.email,
      clientName,
      paymentBehavior,
      rating: rating || 0,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    await kv.set(reviewId, review);

    return c.json({ message: "Review submitted successfully", review });
  } catch (error) {
    console.log(`Error submitting review: ${error.message}`);
    return c.json({ error: `Error submitting review: ${error.message}` }, 500);
  }
});

// Get all reviews
app.get("/make-server-7a1e5de8/reviews", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reviews = await kv.getByPrefix("review:");
    const sortedReviews = reviews.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ reviews: sortedReviews });
  } catch (error) {
    console.log(`Error fetching reviews: ${error.message}`);
    return c.json({ error: `Error fetching reviews: ${error.message}` }, 500);
  }
});

// Get reviews by client name
app.get("/make-server-7a1e5de8/reviews/client/:clientName", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const clientName = c.req.param('clientName');
    const allReviews = await kv.getByPrefix("review:");
    const clientReviews = allReviews.filter(r =>
      r.clientName.toLowerCase() === clientName.toLowerCase()
    );

    return c.json({ reviews: clientReviews });
  } catch (error) {
    console.log(`Error fetching client reviews: ${error.message}`);
    return c.json({ error: `Error fetching client reviews: ${error.message}` }, 500);
  }
});

// Update a review
app.put("/make-server-7a1e5de8/reviews/:reviewId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reviewId = c.req.param('reviewId');
    const existingReview = await kv.get(reviewId);

    if (!existingReview) {
      return c.json({ error: 'Review not found' }, 404);
    }

    if (existingReview.companyEmail !== user.email) {
      return c.json({ error: 'You can only edit your own reviews' }, 403);
    }

    const body = await c.req.json();
    const { clientName, paymentBehavior, rating, notes } = body;

    const updatedReview = {
      ...existingReview,
      clientName,
      paymentBehavior,
      rating: rating || 0,
      notes: notes || '',
      updatedAt: new Date().toISOString()
    };

    await kv.set(reviewId, updatedReview);

    return c.json({ message: "Review updated successfully", review: updatedReview });
  } catch (error) {
    console.log(`Error updating review: ${error.message}`);
    return c.json({ error: `Error updating review: ${error.message}` }, 500);
  }
});

// Delete a review
app.delete("/make-server-7a1e5de8/reviews/:reviewId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reviewId = c.req.param('reviewId');
    const existingReview = await kv.get(reviewId);

    if (!existingReview) {
      return c.json({ error: 'Review not found' }, 404);
    }

    if (existingReview.companyEmail !== user.email) {
      return c.json({ error: 'You can only delete your own reviews' }, 403);
    }

    await kv.del(reviewId);

    return c.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.log(`Error deleting review: ${error.message}`);
    return c.json({ error: `Error deleting review: ${error.message}` }, 500);
  }
});

// Update company password (admin only)
app.put("/make-server-7a1e5de8/companies/:email/password", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const adminUser = await kv.get(`user:${user.email}`);
    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const companyEmail = c.req.param('email');
    const body = await c.req.json();
    const { newPassword } = body;

    if (!newPassword) {
      return c.json({ error: 'New password is required' }, 400);
    }

    const companyUser = await kv.get(`user:${companyEmail}`);
    if (!companyUser) {
      return c.json({ error: 'Company not found' }, 404);
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
      companyUser.id,
      { password: newPassword }
    );

    if (error) {
      console.log(`Error updating password: ${error.message}`);
      return c.json({ error: `Error updating password: ${error.message}` }, 500);
    }

    return c.json({ message: "Password updated successfully" });
  } catch (error) {
    console.log(`Error in password update endpoint: ${error.message}`);
    return c.json({ error: `Error in password update endpoint: ${error.message}` }, 500);
  }
});

// Delete company (admin only)
app.delete("/make-server-7a1e5de8/companies/:email", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const adminUser = await kv.get(`user:${user.email}`);
    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const companyEmail = c.req.param('email');
    const companyUser = await kv.get(`user:${companyEmail}`);

    if (!companyUser) {
      return c.json({ error: 'Company not found' }, 404);
    }

    const { error } = await supabase.auth.admin.deleteUser(companyUser.id);

    if (error) {
      console.log(`Error deleting user from auth: ${error.message}`);
      return c.json({ error: `Error deleting user from auth: ${error.message}` }, 500);
    }

    await kv.del(`user:${companyEmail}`);

    return c.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.log(`Error deleting company: ${error.message}`);
    return c.json({ error: `Error deleting company: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);