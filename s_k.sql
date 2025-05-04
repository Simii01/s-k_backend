-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2025. Máj 04. 22:20
-- Kiszolgáló verziója: 10.4.32-MariaDB
-- PHP verzió: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Adatbázis: `s_k`
--

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `cart`
--

CREATE TABLE `cart` (
  `cart_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `cart`
--

INSERT INTO `cart` (`cart_id`, `user_id`, `quantity`, `product_id`) VALUES
(184, 11, 1, 7),
(185, 11, 2, 6),
(186, 11, 2, 5);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `newsletter`
--

CREATE TABLE `newsletter` (
  `newsletter_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `orders`
--

CREATE TABLE `orders` (
  `order_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `order_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total_amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `orders`
--

INSERT INTO `orders` (`order_id`, `user_id`, `order_date`, `total_amount`) VALUES
(10, 11, '2025-05-04 14:37:59', 500.00);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `quantity`, `unit_price`) VALUES
(12, 10, 6, 1, 300.00),
(13, 10, 7, 1, 200.00);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `products`
--

CREATE TABLE `products` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `category` varchar(20) NOT NULL,
  `brand` varchar(50) NOT NULL,
  `size` varchar(5) NOT NULL,
  `color` varchar(20) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_in_stock` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `products`
--

INSERT INTO `products` (`product_id`, `category`, `brand`, `size`, `color`, `product_name`, `price`, `is_in_stock`) VALUES
(4, 'Waistcoat', 'Ralph Lauren', 'L', 'Dark Blue', 'Ralph West Puffer', 250.00, 1),
(5, 'Waistcoat', 'Ralph Lauren', 'L', 'Black', 'Ralph West Wool', 300.00, 1),
(6, 'Waistcoat', 'Ralph Lauren', 'L', 'Black', 'Ralph West Wool', 300.00, 1),
(7, 'Waistcoat', 'Ralph Lauren', 'L', 'grey', 'Ralph West Cloth', 200.00, 1),
(8, 'Waistcoat', 'Ralph Lauren', 'L', 'Brown', 'Ralph West Wool', 300.00, 1),
(9, 'Waistcoat', 'Ralph Lauren', 'L', 'White', 'Ralph West Wool', 160.00, 1),
(10, 'Waistcoat', 'Ralph Lauren', 'L', 'Dark Brown', 'Ralph West Wool', 280.00, 1),
(11, 'Waistcoat', 'Ralph Lauren', 'L', 'Red', 'Ralph West Puffer', 220.00, 1),
(12, 'Waistcoat', 'Ralph Lauren', 'L', 'Dark Green', 'Ralph West Puffer', 170.00, 1),
(13, 'Dress Shirt', 'Ralph Lauren', 'L', 'Black', 'Ralph Shirt Cloth', 70.00, 1),
(14, 'Dress Shirt', 'Ralph Lauren', 'L', 'Blue', 'Ralph Shirt Cloth', 70.00, 1),
(15, 'Dress Shirt', 'Ralph Lauren', 'L', 'Dark Blue', 'Ralph Shirt', 140.00, 1),
(16, 'Dress Shirt', 'Ralph Lauren', 'L', 'Green', 'Ralph Shirt Cloth', 120.00, 1),
(17, 'Dress Shirt', 'Ralph Lauren', 'L', 'Red', 'Ralph Shirt', 220.00, 1),
(18, 'Dress Shirt', 'Ralph Lauren', 'L', 'Black', 'Ralph Shirt', 165.00, 1),
(19, 'Dress Shirt', 'Ralph Lauren', 'L', 'grey', 'Ralph Shirt', 210.00, 1),
(20, 'Dress Shirt', 'Ralph Lauren', 'L', 'Black', 'Ralph Shirt ', 210.00, 1),
(21, 'Dress Shirt', 'Ralph Lauren', 'L', 'Pink', 'Ralph Shirt Cloth', 200.00, 1),
(22, 'Necktie', 'S&K', '150cm', 'Black', 'S&K Necktie', 20.00, 1),
(23, 'Necktie', 'S&K', '120cm', 'Black,Blue', 'S&K Necktie', 20.00, 1),
(24, 'Necktie', 'S&K', '120cm', 'Black', 'S&K Necktie', 30.00, 1),
(25, 'Necktie', 'S&K', '125cm', 'Light Blue', 'S&K Necktie', 18.00, 1),
(26, 'Necktie', 'S&K', '120cm', 'Red', 'S&K Necktie', 20.00, 1),
(27, 'Necktie', 'S&K', '150cm', 'Dark Blue', 'S&K Necktie', 20.00, 1),
(28, 'Belt', 'S&K', '36', 'Brown', 'S&K Belt', 80.00, 1),
(29, 'Belt', 'S&K', '32', 'Black', 'S&K Belt', 80.00, 1),
(30, 'Belt', 'S&K', '36', 'Dark Brown', 'S&K Belt', 80.00, 1),
(31, 'Belt', 'S&K', '32', 'Brown', 'S&K Belt', 80.00, 1),
(32, 'Belt', 'S&K', '36', 'Black', 'S&K Belt', 80.00, 1),
(33, 'Belt', 'S&K', '32', 'Brown', 'S&K Belt', 80.00, 1),
(34, 'Belt', 'S&K', '36', 'Black', 'S&K Belt', 80.00, 1),
(35, 'Belt', 'S&K', '32', 'Brown', 'S&K Belt', 80.00, 1),
(36, 'Belt', 'S&K', '36', 'Grey', 'S&K Belt', 80.00, 1),
(37, 'Belt', 'S&K', '36', 'Black', 'S&K Belt', 80.00, 1),
(38, 'Trousers', 'S&K', '42', 'Grey', 'S&K Trousers', 170.00, 1),
(39, 'Trousers', 'S&K', '42', 'Blue', 'S&K Trousers', 180.00, 1),
(40, 'Trousers', 'S&K', '42', 'Dark Blue', 'S&K Trousers', 300.00, 1),
(41, 'Trousers', 'S&K', '38', 'Blue', 'S&K Trousers', 200.00, 1),
(42, 'Trousers', 'S&K', '42', 'Brown', 'S&K Trousers', 120.00, 1),
(43, 'Trousers', 'S&K', '36', 'Grey', 'S&K Trousers', 120.00, 1),
(44, 'Trousers', 'S&K', '38', 'Dark Blue', 'S&K Trousers', 200.00, 1),
(45, 'Trousers', 'S&K', '46', 'Grey', 'S&K Trousers', 215.00, 1),
(46, 'Trousers', 'S&K', '42', 'Dark Blue', 'S&K Trousers', 125.00, 1),
(47, 'Trousers', 'S&K', '42', 'Black', 'S&K Trousers', 130.00, 1),
(48, 'Shoes', 'S&K', '42', 'Brown', 'S&K Leather Shoe', 150.00, 1),
(49, 'Shoes', 'S&K', '45', 'Black', 'S&K Leather Shoe', 160.00, 1),
(50, 'Shoes', 'S&K', '42', 'Black', 'S&K Shoe', 200.00, 1),
(51, 'Shoes', 'S&K', '40', 'Black', 'S&K Leather Shoe', 120.00, 1),
(52, 'Shoes', 'S&K', '48', 'Brown', 'S&K Leather Shoe', 180.00, 1),
(53, 'Shoes', 'S&K', '41', 'Brown', 'S&K Leather Shoe', 200.00, 1),
(54, 'Shoes', 'S&K', '42', 'Black', 'S&K Shoe', 150.00, 1),
(55, 'Shoes', 'S&K', '44', 'Brown', 'S&K Leather Shoe', 120.00, 1),
(56, 'Shoes', 'S&K', '42', 'Black', 'S&K Leather Shoe', 170.00, 1),
(57, 'Shoes', 'S&K', '47', 'Dark Brown', 'S&K Leather Shoe', 180.00, 1);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `products_images`
--

CREATE TABLE `products_images` (
  `id` int(11) NOT NULL,
  `product_id` int(11) UNSIGNED NOT NULL,
  `img_url` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `products_images`
--

INSERT INTO `products_images` (`id`, `product_id`, `img_url`) VALUES
(4, 8, '1b.ralph.jpg'),
(6, 4, '3b.ralph.jpg'),
(7, 5, '4b.ralph.png'),
(8, 6, '5b.ralph.png'),
(9, 7, '6b.ralph.jpg'),
(10, 9, '7b.ralph.jpg'),
(11, 10, '8b.ralph.jpg'),
(12, 11, '9b.ralph.png'),
(13, 12, '10b.ralph.jpg'),
(14, 13, '2s.ralph.jpg'),
(15, 14, '3s.ralph.jpg'),
(16, 15, '4s.ralph.png'),
(17, 16, '5s.ralph.jpg'),
(18, 17, '6s.ralph.jpg'),
(19, 18, '7s.ralph.png'),
(20, 19, '8s.ralph.jpg'),
(21, 20, '9s.ralph.png'),
(22, 21, '10s.ralph.jpg'),
(23, 22, '1n.tie.png'),
(24, 23, '2n.tie.png'),
(25, 24, '3n.tie.png'),
(26, 25, '4n.tie.png'),
(27, 26, '5n.tie.png'),
(28, 27, '6n.tie.png'),
(29, 28, '1b.blet.png'),
(30, 29, '2b.blet.jpg'),
(31, 30, '3b.blet.jpg'),
(32, 31, '4b.blet.png'),
(33, 32, '5b.blet.jpg'),
(34, 33, '6b.blet.png'),
(35, 34, '7b.blet.jpg'),
(36, 35, '8b.blet.jpg'),
(37, 36, '9b.blet.jpg'),
(38, 37, '10b.blet.jpg'),
(39, 38, '1t.trousers.png'),
(40, 39, '2t.trousers.png'),
(41, 40, '3t.trousers.png'),
(42, 41, '4t.trousers.png'),
(43, 42, '5t.trousers.png'),
(44, 43, '6t.trousers.jpg'),
(45, 44, '7t.trousers.jpg'),
(46, 45, '8t.trousers.jpg'),
(47, 46, '9t.trousers.png'),
(49, 47, '10t.trousers.jpg'),
(50, 48, '1shoes.jpg'),
(51, 49, '2shoes.jpg'),
(52, 50, '3shoes.jpg'),
(53, 51, '4shoes.png'),
(54, 52, '5shoes.png'),
(55, 53, '6shoes.png'),
(56, 54, '7shoes.png'),
(57, 55, '8shoes.jpg'),
(58, 56, '9shoes.png'),
(59, 57, '10shoes.png');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `users`
--

CREATE TABLE `users` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `profile_picture` varchar(100) NOT NULL,
  `city` varchar(25) NOT NULL,
  `postcode` int(11) NOT NULL,
  `adress` varchar(70) NOT NULL,
  `phone_number` varchar(30) NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `users`
--

INSERT INTO `users` (`user_id`, `username`, `email`, `password`, `created_at`, `profile_picture`, `city`, `postcode`, `adress`, `phone_number`, `is_admin`) VALUES
(8, 'simi', 'simi@gmail.com', '$2b$10$g.kT84aYopzUVCwucCJAg.ar4xpAqDdwjzXgvvZzk5ZbmwiXwDL1G', '2025-05-04 15:03:05', 'geciscsin.jpg', '', 0, '', '', 1),
(11, 'admin', 'admin@a.com', '$2b$10$u79/t0fWpSjJbhWgCQBIQeuVPOpDl24Sl24SdXx3e0KnMFsKijkDO', '2025-05-04 20:02:18', '11-2025-05-04-lauren.png', '', 0, '', '', 1),
(14, 'simi', 'simi@a.com', '$2b$10$JjhNGKDIc/EIYW4vp46JVuMPx3SqgZyev1jMFtFN6ujcJDyRMYLhm', '2025-05-04 17:52:07', 'default.png', '', 0, '', '', 0);

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`cart_id`),
  ADD KEY `cart_user_id_index` (`user_id`),
  ADD KEY `product_id` (`product_id`);

--
-- A tábla indexei `newsletter`
--
ALTER TABLE `newsletter`
  ADD PRIMARY KEY (`newsletter_id`);

--
-- A tábla indexei `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `orders_user_id_index` (`user_id`);

--
-- A tábla indexei `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_items_order_id_index` (`order_id`),
  ADD KEY `order_items_product_id_index` (`product_id`);

--
-- A tábla indexei `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `products_category_index` (`category`),
  ADD KEY `products_brand_index` (`brand`),
  ADD KEY `products_size_index` (`size`);

--
-- A tábla indexei `products_images`
--
ALTER TABLE `products_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- A tábla indexei `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `cart`
--
ALTER TABLE `cart`
  MODIFY `cart_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=187;

--
-- AUTO_INCREMENT a táblához `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT a táblához `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT a táblához `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT a táblához `products_images`
--
ALTER TABLE `products_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT a táblához `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `cart`
--
ALTER TABLE `cart`
  ADD CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `cart_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Megkötések a táblához `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Megkötések a táblához `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Megkötések a táblához `products_images`
--
ALTER TABLE `products_images`
  ADD CONSTRAINT `fk_products_products_images` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
