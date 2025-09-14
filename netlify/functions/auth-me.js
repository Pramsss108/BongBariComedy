const { requireAuth } = require('./_utils/jwt');

exports.handler = async (event) => {
  try {
    const user = requireAuth(event);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.sub }) };
  } catch (e) {
    const status = e.statusCode || 401;
    return { statusCode: status, body: 'Unauthorized' };
  }
};
