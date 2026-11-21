const { query } = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationsRes = await query(`
      SELECT id, user_id, title, message, type, is_read, link, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100;
    `, [userId]);

    const unreadCountRes = await query(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE;
    `, [userId]);

    res.status(200).json({
      success: true,
      notifications: notificationsRes.rows,
      unreadCount: parseInt(unreadCountRes.rows[0].unread_count, 10),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/:id/read - Mark single as read
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2;
    `, [id, userId]);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/read-all - Mark all as read
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1;
    `, [userId]);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await query(`
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2;
    `, [id, userId]);

    res.status(200).json({
      success: true,
      message: 'Notification deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
};
