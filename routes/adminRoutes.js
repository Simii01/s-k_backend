const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "s_k",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

pool.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to database:", err);
        return;
    }
    connection.release();
});

const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(403).json({ error: "Nincs token" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Van token, csak épp nem érvényes" });
        }
        req.user = user;
        next();
    });
};

const checkAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: "Nincs jogosultságod ehhez a művelethez" });
    }
    next();
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = "uploads";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Csak képfájlok engedélyezettek!"));
        }
    },
});

router.get("/users", authenticateToken, checkAdmin, (req, res) => {
    pool.query("SELECT user_id, username, email, is_admin FROM users", (err, result) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).json({ error: "Hiba a felhasználók lekérdezésekor." });
        }
        res.json(result);
    });
});

router.post("/users", authenticateToken, checkAdmin, (req, res) => {
    const { username, email, password, is_admin } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "Minden mező kitöltése kötelező!" });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.status(500).json({ error: "Hiba a jelszó titkosítása során." });
        }

        const sql = "INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)";
        pool.query(sql, [username, email, hash, is_admin || 0], (err, result) => {
            if (err) {
                console.error("Error creating user:", err);
                return res.status(500).json({ error: "Hiba a felhasználó létrehozásakor." });
            }
            res.status(201).json({ message: "Felhasználó sikeresen létrehozva!" });
        });
    });
});

router.put("/users/:id", authenticateToken, checkAdmin, (req, res) => {
    const userId = req.params.id;
    const { username, email, password, is_admin } = req.body;

    if (!username || !email) {
        return res.status(400).json({ error: "A név és email megadása kötelező!" });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Error starting transaction:", err);
                return res.status(500).json({ error: "Tranzakciós hiba." });
            }

            connection.query("SELECT user_id FROM users WHERE user_id = ?", [userId], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error checking user:", err);
                        res.status(500).json({ error: "Hiba a felhasználó ellenőrzésekor." });
                    });
                }

                if (result.length === 0) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(404).json({ error: "Felhasználó nem található." });
                    });
                }

                connection.query("SELECT user_id FROM users WHERE email = ? AND user_id != ?", [email, userId], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Error checking email:", err);
                            res.status(500).json({ error: "Hiba az email ellenőrzésekor." });
                        });
                    }

                    if (result.length > 0) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(400).json({ error: "Ez az email cím már használatban van." });
                        });
                    }

                    if (password) {
                        bcrypt.hash(password, 10, (err, hash) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error hashing password:", err);
                                    res.status(500).json({ error: "Hiba a jelszó titkosítása során." });
                                });
                            }

                            const sql = "UPDATE users SET username = ?, email = ?, password = ?, is_admin = ? WHERE user_id = ?";
                            connection.query(sql, [username, email, hash, is_admin || 0, userId], (err, result) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error("Error updating user:", err);
                                        res.status(500).json({ error: "Hiba a felhasználó frissítésekor." });
                                    });
                                }

                                connection.commit((err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            console.error("Error committing transaction:", err);
                                            res.status(500).json({ error: "Tranzakciós hiba." });
                                        });
                                    }
                                    connection.release();
                                    res.json({ message: "Felhasználó sikeresen frissítve!" });
                                });
                            });
                        });
                    } else {
                        const sql = "UPDATE users SET username = ?, email = ?, is_admin = ? WHERE user_id = ?";
                        connection.query(sql, [username, email, is_admin || 0, userId], (err, result) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error updating user:", err);
                                    res.status(500).json({ error: "Hiba a felhasználó frissítésekor." });
                                });
                            }

                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error("Error committing transaction:", err);
                                        res.status(500).json({ error: "Tranzakciós hiba." });
                                    });
                                }
                                connection.release();
                                res.json({ message: "Felhasználó sikeresen frissítve!" });
                            });
                        });
                    }
                });
            });
        });
    });
});

router.delete("/users/:id", authenticateToken, checkAdmin, (req, res) => {
    const userId = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Error starting transaction:", err);
                return res.status(500).json({ error: "Tranzakciós hiba." });
            }

            connection.query("SELECT user_id FROM users WHERE user_id = ?", [userId], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error checking user:", err);
                        res.status(500).json({ error: "Hiba a felhasználó ellenőrzésekor." });
                    });
                }

                if (result.length === 0) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(404).json({ error: "Felhasználó nem található." });
                    });
                }

                connection.query("DELETE FROM cart WHERE user_id = ?", [userId], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Error deleting cart items:", err);
                            res.status(500).json({ error: "Hiba a kosár törlésekor." });
                        });
                    }

                    connection.query("DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE user_id = ?)", [userId], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("Error deleting order items:", err);
                                res.status(500).json({ error: "Hiba a rendelési tételek törlésekor." });
                            });
                        }

                        connection.query("DELETE FROM orders WHERE user_id = ?", [userId], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error deleting orders:", err);
                                    res.status(500).json({ error: "Hiba a rendelések törlésekor." });
                                });
                            }

                            connection.query("DELETE FROM users WHERE user_id = ?", [userId], (err, result) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error("Error deleting user:", err);
                                        res.status(500).json({ error: "Hiba a felhasználó törlésekor." });
                                    });
                                }

                                connection.commit((err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            console.error("Error committing transaction:", err);
                                            res.status(500).json({ error: "Tranzakciós hiba." });
                                        });
                                    }
                                    connection.release();
                                    res.json({ message: "Felhasználó sikeresen törölve!" });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

router.get("/users/:id", authenticateToken, checkAdmin, (req, res) => {
    const userId = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.query("SELECT user_id, username, email, is_admin FROM users WHERE user_id = ?", [userId], (err, result) => {
            connection.release();

            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).json({ error: "Hiba a felhasználó lekérdezésekor." });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: "Felhasználó nem található." });
            }

            res.json(result[0]);
        });
    });
});

router.get("/products", authenticateToken, checkAdmin, (req, res) => {
    pool.query(
        `
        SELECT p.*, GROUP_CONCAT(pi.img_url) as images 
        FROM products p 
        LEFT JOIN products_images pi ON p.product_id = pi.product_id 
        GROUP BY p.product_id
    `,
        (err, result) => {
            if (err) {
                console.error("Error fetching products:", err);
                return res.status(500).json({ error: "Hiba a termékek lekérdezésekor." });
            }
            res.json(result);
        }
    );
});

router.post("/products", authenticateToken, checkAdmin, upload.array("images", 5), (req, res) => {
    const { product_name, category, brand, size, color, price, is_in_stock } = req.body;

    if (!product_name || !category || !price) {
        return res.status(400).json({ error: "A név, kategória és ár megadása kötelező!" });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Error starting transaction:", err);
                return res.status(500).json({ error: "Tranzakciós hiba." });
            }

            const productSql = "INSERT INTO products (product_name, category, brand, size, color, price, is_in_stock) VALUES (?, ?, ?, ?, ?, ?, ?)";
            connection.query(productSql, [product_name, category, brand, size, color, price, is_in_stock], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error creating product:", err);
                        res.status(500).json({ error: "Hiba a termék létrehozásakor." });
                    });
                }

                const productId = result.insertId;
                if (req.files && req.files.length > 0) {
                    const imageSql = "INSERT INTO products_images (product_id, img_url) VALUES ?";
                    const imageValues = req.files.map((file) => [productId, file.filename]);

                    connection.query(imageSql, [imageValues], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("Error saving images:", err);
                                res.status(500).json({ error: "Hiba a képek mentésekor." });
                            });
                        }

                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error committing transaction:", err);
                                    res.status(500).json({ error: "Tranzakciós hiba." });
                                });
                            }
                            connection.release();
                            res.status(201).json({ message: "Termék sikeresen létrehozva!" });
                        });
                    });
                } else {
                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("Error committing transaction:", err);
                                res.status(500).json({ error: "Tranzakciós hiba." });
                            });
                        }
                        connection.release();
                        res.status(201).json({ message: "Termék sikeresen létrehozva!" });
                    });
                }
            });
        });
    });
});

router.put("/products/:id", authenticateToken, checkAdmin, upload.array("images", 5), (req, res) => {
    const productId = req.params.id;
    const { product_name, category, brand, size, color, price, is_in_stock } = req.body;

    if (!product_name || !category || !price) {
        return res.status(400).json({ error: "A név, kategória és ár megadása kötelező!" });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Error starting transaction:", err);
                return res.status(500).json({ error: "Tranzakciós hiba." });
            }

            connection.query("SELECT product_id FROM products WHERE product_id = ?", [productId], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error checking product:", err);
                        res.status(500).json({ error: "Hiba a termék ellenőrzésekor." });
                    });
                }

                if (result.length === 0) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(404).json({ error: "Termék nem található." });
                    });
                }

                const productSql = "UPDATE products SET product_name = ?, category = ?, brand = ?, size = ?, color = ?, price = ?, is_in_stock = ? WHERE product_id = ?";
                connection.query(productSql, [product_name, category, brand, size, color, price, is_in_stock, productId], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Error updating product:", err);
                            res.status(500).json({ error: "Hiba a termék frissítésekor." });
                        });
                    }

                    if (req.files && req.files.length > 0) {
                        connection.query("SELECT img_url FROM products_images WHERE product_id = ?", [productId], (err, oldImages) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error fetching old images:", err);
                                    res.status(500).json({ error: "Hiba a régi képek lekérdezésekor." });
                                });
                            }

                            oldImages.forEach((image) => {
                                const filePath = path.join("uploads", image.img_url);
                                if (fs.existsSync(filePath)) {
                                    try {
                                        fs.unlinkSync(filePath);
                                    } catch (e) {
                                        console.warn("Nem sikerült törölni a képet:", filePath);
                                    }
                                }
                            });

                            connection.query("DELETE FROM products_images WHERE product_id = ?", [productId], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error("Error deleting old images:", err);
                                        res.status(500).json({ error: "Hiba a régi képek törlésekor." });
                                    });
                                }

                                const imageSql = "INSERT INTO products_images (product_id, img_url) VALUES ?";
                                const imageValues = req.files.map((file) => [productId, file.filename]);

                                connection.query(imageSql, [imageValues], (err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            console.error("Error saving new images:", err);
                                            res.status(500).json({ error: "Hiba az új képek mentésekor." });
                                        });
                                    }

                                    connection.commit((err) => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                connection.release();
                                                console.error("Error committing transaction:", err);
                                                res.status(500).json({ error: "Tranzakciós hiba." });
                                            });
                                        }
                                        connection.release();
                                        res.json({ message: "Termék sikeresen frissítve!" });
                                    });
                                });
                            });
                        });
                    } else {
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error committing transaction:", err);
                                    res.status(500).json({ error: "Tranzakciós hiba." });
                                });
                            }
                            connection.release();
                            res.json({ message: "Termék sikeresen frissítve!" });
                        });
                    }
                });
            });
        });
    });
});

router.delete("/products/:id", authenticateToken, checkAdmin, (req, res) => {
    const productId = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Error starting transaction:", err);
                return res.status(500).json({ error: "Tranzakciós hiba." });
            }

            connection.query("SELECT img_url FROM products_images WHERE product_id = ?", [productId], (err, images) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error fetching images:", err);
                        res.status(500).json({ error: "Hiba a képek lekérdezésekor." });
                    });
                }

                images.forEach((image) => {
                    const filePath = path.join("uploads/products", image.img_url);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });

                connection.query("DELETE FROM products_images WHERE product_id = ?", [productId], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Error deleting images:", err);
                            res.status(500).json({ error: "Hiba a képek törlésekor." });
                        });
                    }

                    connection.query("DELETE FROM products WHERE product_id = ?", [productId], (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("Error deleting product:", err);
                                res.status(500).json({ error: "Hiba a termék törlésekor." });
                            });
                        }

                        if (result.affectedRows === 0) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(404).json({ error: "Termék nem található." });
                            });
                        }

                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("Error committing transaction:", err);
                                    res.status(500).json({ error: "Tranzakciós hiba." });
                                });
                            }
                            connection.release();
                            res.json({ message: "Termék sikeresen törölve!" });
                        });
                    });
                });
            });
        });
    });
});

router.get("/products/:id", authenticateToken, checkAdmin, (req, res) => {
    const productId = req.params.id;

    pool.query(
        `SELECT p.*, GROUP_CONCAT(pi.img_url) as images
         FROM products p
         LEFT JOIN products_images pi ON p.product_id = pi.product_id
         WHERE p.product_id = ?
         GROUP BY p.product_id`,
        [productId],
        (err, result) => {
            if (err) {
                console.error("Error fetching product:", err);
                return res.status(500).json({ error: "Hiba a termék lekérdezésekor." });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: "Termék nem található." });
            }

            const product = result[0];
            product.images = product.images
                ? product.images
                      .split(",")
                      .filter(Boolean)
                      .map((img) => `/uploads/products/${img}`)
                : [];
            res.json(product);
        }
    );
});

router.get("/orders", authenticateToken, checkAdmin, (req, res) => {
    pool.query(
        `
        SELECT o.*, u.username, u.email 
        FROM orders o 
        JOIN users u ON o.user_id = u.user_id 
        ORDER BY o.order_date DESC
    `,
        (err, result) => {
            if (err) {
                console.error("Error fetching orders:", err);
                return res.status(500).json({ error: "Hiba a rendelések lekérdezésekor." });
            }
            res.json(result);
        }
    );
});

router.get("/orders/:id", authenticateToken, checkAdmin, (req, res) => {
    const orderId = req.params.id;

    pool.query(
        `
        SELECT o.*, u.username, u.email, 
               oi.product_id, p.product_name, oi.quantity, oi.unit_price
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE o.order_id = ?
    `,
        [orderId],
        (err, result) => {
            if (err) {
                console.error("Error fetching order details:", err);
                return res.status(500).json({ error: "Hiba a rendelés részleteinek lekérdezésekor." });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: "Rendelés nem található." });
            }

            const order = {
                order_id: result[0].order_id,
                username: result[0].username,
                email: result[0].email,
                order_date: result[0].order_date,
                status: result[0].status,
                total_amount: result[0].total_amount,
                items: result.map((row) => ({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                    unit_price: row.unit_price,
                })),
            };

            res.json(order);
        }
    );
});

router.delete("/orders/:id", authenticateToken, checkAdmin, (req, res) => {
    const orderId = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting connection:", err);
            return res.status(500).json({ error: "Adatbázis kapcsolódási hiba." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error("Error starting transaction:", err);
                return res.status(500).json({ error: "Tranzakciós hiba." });
            }

            connection.query("DELETE FROM order_items WHERE order_id = ?", [orderId], (err) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error deleting order items:", err);
                        res.status(500).json({ error: "Hiba a rendelési tételek törlésekor." });
                    });
                }

                connection.query("DELETE FROM orders WHERE order_id = ?", [orderId], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Error deleting order:", err);
                            res.status(500).json({ error: "Hiba a rendelés törlésekor." });
                        });
                    }

                    if (result.affectedRows === 0) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(404).json({ error: "Rendelés nem található." });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("Error committing transaction:", err);
                                res.status(500).json({ error: "Tranzakciós hiba." });
                            });
                        }
                        connection.release();
                        res.json({ message: "Rendelés sikeresen törölve!" });
                    });
                });
            });
        });
    });
});

module.exports = router;
