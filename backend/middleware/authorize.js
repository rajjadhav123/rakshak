/**
 * authorize(...allowedRoles)
 * Simple allow-list check. Use this for "only these roles may call this
 * endpoint at all" — jurisdiction-level scoping (state/district match)
 * is applied separately inside each controller, since it depends on
 * the specific resource being accessed, not just the role.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not permitted to perform this action`);
    }
    if (req.user.status === 'pending_approval') {
      res.status(403);
      throw new Error('Your official account is awaiting approval from a senior administrator');
    }
    next();
  };
};

module.exports = { authorize };
