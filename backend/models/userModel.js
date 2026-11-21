const { query } = require('../config/db');

const createUser = async ({ name, email, password, role = 'buyer', balance = 1000.0 }) => {
  const text = `
    INSERT INTO users (name, email, password, role, balance)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, role, balance, avatar_url, created_at;
  `;
  const res = await query(text, [name.trim(), email.toLowerCase().trim(), password, role, balance]);
  return res.rows[0];
};

const findUserByEmail = async (email) => {
  const text = `
    SELECT id, name, email, password, role, balance, avatar_url, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1);
  `;
  const res = await query(text, [email.trim()]);
  return res.rows[0];
};

const findUserById = async (id) => {
  const text = `
    SELECT id, name, email, role, balance, avatar_url, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const res = await query(text, [id]);
  return res.rows[0];
};

const getAllUsers = async (limit = 50) => {
  const text = `
    SELECT id, name, email, role, balance, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1;
  `;
  const res = await query(text, [limit]);
  return res.rows;
};

const getUserStats = async () => {
  const text = `
    SELECT 
      COUNT(*) AS total_users,
      COUNT(*) FILTER (WHERE role = 'admin') AS admin_count,
      COUNT(*) FILTER (WHERE role = 'seller') AS seller_count,
      COUNT(*) FILTER (WHERE role = 'buyer') AS buyer_count,
      COALESCE(SUM(balance), 0) AS total_escrow_balance
    FROM users;
  `;
  const res = await query(text);
  return res.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  getUserStats,
};
