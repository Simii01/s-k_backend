const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const validator = require("validator");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { ifError } = require("assert");
const { log, error } = require("console");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: "https://sandk.netlify.app",
        credentials: true,
    })
);
// komment
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
//sql connection
dotenv.config();
const PORT = process.env.PORT;
const HOSTNAME = process.env.HOSTNAME;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

pool.getConnection((err, res) => {
    if (err) {
        console.error("Hiba az sql csatlakozáskor!");
        return;
    }

    console.log("Sikeres csatlakozik az adatbázihoz!");

    // egy lekérdezés az adatbásis muködéséről
    res.query((err, res) => {
        if (err) {
            console.error("Hiba az sql csatlakozáskor!");
        } else {
            console.log("Müködik :D");
        }
    });
});

//mutlter
const uploadDir = "uploads/";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const now = new Date().toISOString().split("T")[0];
        cb(null, `${req.user.id}-${now}-${file.originalname}`);
    },
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp|avif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Csak képformátumok megengedettek!"));
        }
    },
});

//JWT
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    const token = req.cookies.auth_token;

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

//register
app.post("/api/Register", (req, res) => {
    const { email, username, password } = req.body;
    const errors = [];
    console.log(email, username, password);

    if (!validator.isEmail(email)) {
        errors.push({ error: "Az e-mail cím nem létezik!" });
    }

    if (validator.isEmpty(username)) {
        errors.push({ error: "Töltsd ki a név mezőt!" });
    }

    if (!validator.isLength(password, { min: 6 })) {
        errors.push({ error: "A jelszónak legalább 6 karakternek kell lennie!" });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.log(`bcrypt után: ${err}`);
            return res.status(500).json({ error: "Hiba a hashelés során" });
        }

        const sql = 'INSERT INTO users(user_id, email, username, password, profile_picture) VALUES(NULL, ?, ?, ?, "default.png")';

        pool.query(sql, [email, username, hash], (err, result) => {
            if (err) {
                console.log(`regisztráció adatbázis: ${err}`);
                return res.status(500).json({ error: "SQL hiba!" });
            }
            console.log(result);
            res.status(201).json({ message: "Sikeres regisztráció! " });
        });
    });
});

//login
app.post("/api/Login", (req, res) => {
    const { email, password } = req.body;
    console.log(email, password);
    const errors = [];

    if (!validator.isEmail(email)) {
        errors.push({ error: "Add meg az e-mail címet! " });
    }

    if (validator.isEmpty(password)) {
        errors.push({ error: "Add meg a jelszót!" });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    try {
        const sql = "SELECT * FROM users WHERE email LIKE ?";
        pool.query(sql, [email], (err, result) => {
            if (err) {
                console.log(`felhasználó ellenőrzése hiba: ${err}`);
                return res.status(500).json({ error: "Hiba az SQL-ben!" });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: "A felhasználó nem találató!" });
            }
            console.log(result);
            const user = result[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (isMatch) {
                    // Create JWT token
                    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1y" });
                    
                    // Set the token as a cookie
                    res.cookie("auth_token", token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: "lax",
                        maxAge: 1000 * 60 * 60 * 24 * 30 * 12,
                    });

                    // Send back the user data along with the token
                    res.status(201).json({
                        token,
                        user: {
                            id: user.user_id,
                            username: user.username,
                            email: user.email,
                        },
                    });
                } else {
                    return res.status(401).json({ error: "Az e-mail cím vagy a jelszó nem egyezik!" });
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Nem ment a bcrypt vagy a reg Internal server error." });
    }
});

//logout
app.post("/api/Logout", authenticateToken, (req, res) => {
    res.clearCookie("auth_token", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    });
    return res.status(200).json({ message: "Sikeres kijelentkezés!" });
});

//profile
app.get("/api/Profile", authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const sql = "SELECT * FROM users WHERE user_id = ?";
    console.log(user_id);
    pool.query(sql, [user_id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.length === 0) return res.status(404).json({ message: "User not found" });
        return res.json(result);
    });
});

//profile kép megjelenítése
app.get("/api/getProfilePic", authenticateToken, (req, res) => {
    const user_id = req.user.id;

    const sql = "SELECT profile_picture FROM users WHERE user_id = ?";
    pool.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Hiba az SQL-ben" });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "A felhasználó nem található" });
        }

        return res.status(200).json(result);
    });
});

// profilkép szerkesztése
app.put("/api/editProfilePic", authenticateToken, upload.single("profile_picture"), (req, res) => {
    const user_id = req.user.id;
    const profile_picture = req.file ? req.file.filename : null;

    //console.log(user_id, profile_pic);
    const sql = 'UPDATE users SET profile_picture = COALESCE(NULLIF(?, ""), profile_picture) WHERE user_id = ?';

    pool.query(sql, [profile_picture, user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Hiba az SQL-ben" });
        }

        return res.status(200).json({ message: "Profilkép frissítve" });
    });
});

//password change
app.put("/api/editProfilePassword", authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const password = req.body.password;
    const salt = 10;

    console.log(user_id, password);
    if (password === "" || !validator.isLength(password, { min: 6 })) {
        return res.status(400).json({ error: "A jelszónak min 6 karakterből kell állnia!" });
    }

    bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: "Hiba a sózáskor!" });
        }

        const sql = 'UPDATE users SET password = COALESCE(NULLIF(?, ""), password) WHERE user_id = ?';

        pool.query(sql, [hash, user_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Hiba az SQL-ben" });
            }

            return res.status(200).json({ message: "Jelszó módosítva! Most kijelentkeztetlek." });
        });
    });
});

//username change
app.put("/api/editProfileUsername", authenticateToken, (req, res) => {
    const user_id = req.user.id; // A felhasználó ID-ja az autentikációs tokenből
    const username = req.body.username; // Az új profilnév
    console.log(user_id, username);
    // Ellenőrizzük, hogy a profilnév nem üres és érvényes-e
    if (!username || !validator.isLength(username, { min: 3, max: 30 })) {
        return res.status(400).json({ error: "A profilnévnek 3 és 30 karakter között kell lennie!" });
    }

    // SQL lekérdezés, hogy frissítsük a profilnevet
    const sql = 'UPDATE users SET username = COALESCE(NULLIF(?, ""), username) WHERE user_id = ?';

    pool.query(sql, [username, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Hiba az SQL-ben" });
        }

        // Sikeres frissítés
        console.log(result);
        return res.status(200).json({ message: "Profilnév módosítva!" });
    });
});

//email change
app.put("/api/editProfileEmail", authenticateToken, (req, res) => {
    const user_id = req.user.id; // Felhasználó azonosítása a JWT-ből
    const { id, newEmail, password } = req.body; // Új email és jelszó bekérése
    console.log(user_id, id, newEmail, password);
    if (!validator.isEmail(newEmail)) {
        return res.status(400).json({ error: "Érvénytelen e-mail cím!" });
    }

    // Ellenőrizzük, hogy az új e-mail nem foglalt-e
    const checkEmailSQL = "SELECT * FROM users WHERE email = ?";
    pool.query(checkEmailSQL, [newEmail], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "SQL hiba az ellenőrzéskor!" });
        }
        if (result.length > 0) {
            return res.status(400).json({ error: "Ez az e-mail már használatban van!" });
        }

        // Ellenőrizzük a jelszót
        const getPasswordSQL = "SELECT password FROM users WHERE user_id = ?";
        pool.query(getPasswordSQL, [id], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: "SQL hiba a jelszó ellenőrzéskor!" });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: "Felhasználó nem található!" });
            }

            const storedPassword = result[0].password;
            bcrypt.compare(password, storedPassword, (err, isMatch) => {
                if (!isMatch) {
                    return res.status(401).json({ error: "Hibás jelszó!" });
                }

                // Ha minden jó, frissítjük az e-mailt
                const updateEmailSQL = "UPDATE users SET email = ? WHERE user_id = ?";
                pool.query(updateEmailSQL, [newEmail, id], (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: "Hiba az SQL frissítés során!" });
                    }
                    return res.status(200).json({ message: "E-mail cím sikeresen módosítva!" });
                });
            });
        });
    });
});
//listing products
app.get("/api/listing", authenticateToken, (req, res) => {
    const filter = req.query.type;
    let sql = `
        SELECT 
            products.product_id, 
            products.brand, 
            products.category, 
            products.size, 
            products.color, 
            products.price, 
            products_images.img_url 
        FROM products 
        LEFT JOIN products_images 
        ON products.product_id = products_images.product_id
    `;
    const params = [];

    if (filter) {
        sql += " WHERE products.category = ?";
        params.push(filter);
    }

    pool.query(sql, params, (err, result) => {
        if (err) {
            console.error("SQL hiba:", err); // Log the full SQL error
            return res.status(500).json({ error: "Adatbázis hiba.", details: err.message });
        }

        res.status(200).json(result);
    });
});

// Kosárhoz adás
app.post("/api/cart", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    if (!product_id || quantity <= 0) {
        return res.status(400).json({ error: "Érvénytelen adatok!" });
    }

    const insert = () => {
        const sql = `
        INSERT INTO cart (user_id, product_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?;
    `;

        pool.query(sql, [userId, product_id, quantity, quantity], (err) => {
            if (err) {
                console.error("SQL hiba:", err);
                return res.status(500).json({ error: "Adatbázis hiba." });
            }

            //const asd = `SELECT cart.`;

            pool.query(
                `
            SELECT cart.product_id, products.product_name, products.price, 
       MIN(products_images.img_url) AS img_url,  -- Az első képet veszi
       cart.quantity, 
       (products.price * cart.quantity) AS total_price
FROM cart
INNER JOIN products ON cart.product_id = products.product_id
INNER JOIN products_images ON products.product_id = products_images.product_id
WHERE cart.user_id = ?
GROUP BY cart.product_id, products.product_name, products.price, cart.quantity;
`,
                [userId],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: err });
                    }
                    res.status(201).json({ message: "Kosár frissítve!", cart: result });
                }
            );
        });
    }

    pool.query("SELECT * FROM cart WHERE product_id = ?", [product_id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err });

            return;
        }

        console.log("kecske", result)

        if (result.length == 1) {
            pool.query("UPDATE cart SET quantity = ? WHERE product_id = ?", [quantity, product_id], (err) => {
                if (err) {
                    res.status(500).json({ error: err })

                    return;
                }

                pool.query(
                    `
                SELECT cart.product_id, products.product_name, products.price, 
           MIN(products_images.img_url) AS img_url,  -- Az első képet veszi
           cart.quantity, 
           (products.price * cart.quantity) AS total_price
    FROM cart
    INNER JOIN products ON cart.product_id = products.product_id
    INNER JOIN products_images ON products.product_id = products_images.product_id
    WHERE cart.user_id = ?
    GROUP BY cart.product_id, products.product_name, products.price, cart.quantity;
    `,
                    [userId],
                    (err, result) => {
                        if (err) {

                            return res.status(500).json({ error: err });
                        }

                        return res.status(201).json({ message: "Kosár frissítve!", cart: result });
                    }
                );

            })
        } else {
            insert();
        }
    })
});

// Kosár listázása
app.get("/api/cart", authenticateToken, (req, res) => {
    const userId = req.user.id;

    let sql = `
    SELECT cart.product_id, products.product_name, products.price, 
       MIN(products_images.img_url) AS img_url,  -- Az első képet veszi
       cart.quantity, 
       (products.price * cart.quantity) AS total_price
FROM cart
INNER JOIN products ON cart.product_id = products.product_id
INNER JOIN products_images ON products.product_id = products_images.product_id
WHERE cart.user_id = ?
GROUP BY cart.product_id, products.product_name, products.price, cart.quantity;

`;

    pool.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("SQL hiba:", err);
            return res.status(500).json({ error: "Adatbázis hiba." });
        }
        res.status(200).json(result);
    });
});

// Termék eltávolítása a kosárból
app.delete("/api/cart/:product_id", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { product_id } = req.params;

    let sql = `DELETE FROM cart WHERE user_id = ? AND product_id = ?`;

    pool.query(sql, [userId, product_id], (err, result) => {
        if (err) {
            console.error("SQL hiba:", err);
            return res.status(500).json({ error: "Adatbázis hiba." });
        }
        res.status(200).json({ message: "Termék eltávolítva a kosárból!" });
    });
});

// Kosár ürítése
app.delete("/api/cart", authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = `DELETE FROM cart WHERE user_id = ?`;

    pool.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("SQL hiba:", err);
            return res.status(500).json({ error: "Adatbázis hiba." });
        }
        res.status(200).json({ message: "Kosár ürítve!" });
    });
});

//order
app.post("/api/order", authenticateToken, (req, res) => {
    const userId = req.user.id; // Bejelentkezett felhasználó ID-ja
    const { products, total_price, address } = req.body;

    if (!products || products.length === 0) {
        return res.status(400).json({ error: "A rendelésnek tartalmaznia kell legalább egy terméket!" });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("SQL kapcsolódási hiba!", err);
            return res.status(500).json({ error: "Adatbázis hiba" });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Hiba a tranzakció indításakor!", err);
                return res.status(500).json({ error: "Tranzakciós hiba" });
            }

            const orderQuery = `
                INSERT INTO orders (user_id, total_price, address, created_at) 
                VALUES (?, ?, ?, NOW())
            `;

            connection.query(orderQuery, [userId, total_price, address], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Hiba a rendelés mentésekor!", err);
                        res.status(500).json({ error: "Nem sikerült a rendelés mentése" });
                    });
                }

                const orderId = result.insertId; // Az új rendelés ID-ja
                const orderItemsQuery = `
                    INSERT INTO order_items (order_id, product_id, quantity, price) 
                    VALUES ?
                `;

                const orderItemsData = products.map((product) => [orderId, product.product_id, product.quantity, product.price]);

                connection.query(orderItemsQuery, [orderItemsData], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Hiba a rendelési tételek mentésekor!", err);
                            res.status(500).json({ error: "Nem sikerült a rendelési tételek mentése" });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("Hiba a tranzakció véglegesítésekor!", err);
                                res.status(500).json({ error: "Tranzakciós hiba" });
                            });
                        }
                        connection.release();
                        res.status(201).json({ message: "Rendelés sikeresen leadva!", orderId });
                    });
                });
            });
        });
    });
});

app.get("/api/search", (req, res) => {
    const search = req.query.q; // URL query paraméterből olvasás
    if (!search) {
        return res.status(400).json({ error: "Nincs keresési feltétel megadva" });
    }

    console.log("Keresési feltétel:", search);

    const sql = `
        SELECT * FROM products JOIN products_images USING(product_id)
        WHERE products.category LIKE ? OR products.brand LIKE ? OR products.size LIKE ? OR products.color LIKE ?
    `;

    const searchTerm = `%${search}%`; // Helyes LIKE formázás
    pool.query(sql, [searchTerm, searchTerm, searchTerm, searchTerm], (err, result) => {
        if (err) {
            console.error("SQL hiba:", err);
            return res.status(500).json({ error: "Szerver hiba" });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Keresett elem nem található" });
        }

        return res.status(200).json(result);
    });
});

app.get("/api/product/:product_id", authenticateToken, (req, res) => {
    const productId = req.params.product_id;

    // Validate productId
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ error: "Invalid product ID." });
    }

    const sql = `
        SELECT 
            p.product_id, 
            p.brand, 
            p.category, 
            p.size, 
            p.color, 
            p.product_name, 
            p.price, 
            p.is_in_stock, 
            pi.img_url
        FROM products p
        LEFT JOIN products_images pi ON p.product_id = pi.product_id
        WHERE p.product_id = ?
    `;

    pool.query(sql, [productId], (err, result) => {
        if (err) {
            console.error("SQL error:", err); // Log the SQL error
            return res.status(500).json({ error: "Database error.", details: err.message });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.status(200).json(result[0]);
    });
});


app.listen(process.env.PORT, () => {
    console.log(`IP: ${process.env.HOSTNAME}:${process.env.PORT}`);
});
