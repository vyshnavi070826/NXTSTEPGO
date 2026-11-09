const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const storage = require("../services/storage");

const JWT_SECRET = process.env.JWT_SECRET || 'nxtstepgo_production_secret_key';
const JWT_EXPIRES_IN = '7d';

/**
 * Register a new student user
 */
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await storage.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists"
      });
    }

    // Hash password securely with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await storage.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      profile: {
        currentDepartment: 'all'
      }
    });

    // Generate secure session token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log signup event
    await storage.logUserAction(newUser._id, 'SIGNUP', {
      resourceType: 'user',
      resourceId: String(newUser._id),
      metadata: {
        email: newUser.email,
        name: newUser.name
      },
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.status(201).json({
      message: "Signup successful",
      token,
      userId: newUser._id,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profile: newUser.profile
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: error.message || "Failed to create account"
    });
  }
};

/**
 * Authenticate student user and return session token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await storage.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    // Verify password via bcrypt, or check legacy plain-text and auto-upgrade
    let passwordMatches = false;
    if (user.password && user.password.startsWith('$2')) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else if (user.password === password) {
      passwordMatches = true;
      // Auto-upgrade plain-text password to bcrypt hash
      const upgradedHash = await bcrypt.hash(password, 10);
      await storage.updateUser(user._id, { password: upgradedHash });
    }

    if (!passwordMatches) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    // Ensure preferences exist
    await storage.getPreferences(user._id);

    // Generate secure session token
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log login event
    await storage.logUserAction(user._id, 'LOGIN', {
      resourceType: 'user',
      resourceId: String(user._id),
      metadata: {
        email: user.email,
        name: user.name
      },
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.json({
      message: "Login successful",
      token,
      userId: user._id,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: error.message || "Failed to log in"
    });
  }
};
