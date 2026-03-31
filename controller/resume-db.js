/**
 * resume-db.js - resumes 表 CRUD 函数
 *
 * 简历元数据管理（存路径，不存文件内容）。
 * 依赖 db.js 中的 getDatabase() 获取数据库实例。
 */

const { getDatabase } = require('./db');

/**
 * 插入单条简历记录
 *
 * @param {Object} params
 * @param {string} params.fileName - 文件名
 * @param {string} params.filePath - 文件绝对路径
 * @param {number} [params.fileSize] - 文件大小（字节）
 * @returns {{ success: boolean, id?: number, error?: string }}
 */
function insertResume({ fileName, filePath, fileSize }) {
  const db = getDatabase();
  try {
    const result = db.prepare(`
      INSERT INTO resumes (file_name, file_path, file_size)
      VALUES (?, ?, ?)
    `).run(fileName, filePath, fileSize || null);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取最新上传的简历（单份简历场景）
 *
 * @returns {Object|undefined}
 */
function getLatestResume() {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM resumes ORDER BY datetime(upload_time) DESC, id DESC LIMIT 1'
  ).get();
}

/**
 * 获取所有简历历史记录
 *
 * @returns {Array<Object>}
 */
function getAllResumes() {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM resumes ORDER BY datetime(upload_time) DESC, id DESC'
  ).all();
}

/**
 * 按 id 删除简历记录（不删物理文件，API 层负责）
 *
 * @param {number} id
 * @returns {boolean} 是否删除成功
 */
function deleteResume(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM resumes WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 统计简历数量
 *
 * @returns {number}
 */
function getResumeCount() {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) AS count FROM resumes').get();
  return row?.count || 0;
}

/**
 * 通用更新简历字段（基于最新记录）
 *
 * @param {Object} fields - 需要更新的字段键值对
 * @returns {{ success: boolean, resume?: Object, error?: string }}
 */
function updateResume(fields) {
  const db = getDatabase();
  const latest = getLatestResume();
  if (!latest) {
    return { success: false, error: 'No resume record found', statusCode: 404 };
  }

  const setClauses = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (setClauses.length === 0) {
    return { success: false, error: 'No fields to update' };
  }

  try {
    values.push(latest.id);
    db.prepare(
      `UPDATE resumes SET ${setClauses.join(', ')} WHERE id = ?`
    ).run(...values);

    const updated = getLatestResume();
    return { success: true, resume: updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  insertResume,
  getLatestResume,
  getAllResumes,
  deleteResume,
  getResumeCount,
  updateResume
};
