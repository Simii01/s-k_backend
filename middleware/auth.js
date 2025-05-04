const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
    }

    if (!token) {
        return res.status(403).json({ error: "Nincs token" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Van token, csak épp nem érvényes" });
        }
        req.user = user;
        next();
    });
}
function checkAdmin(req, res, next) {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: "Nincs jogosultságod ehhez a művelethez" });
    }
    next();
}

module.exports = {
    authenticateToken,
    checkAdmin,
};
