// Importing the necessary libraries
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8787;

// Import crawler routes
const crawlerRoutes = require('./routes/crawlerRoutes');
app.use(express.json()); // Add JSON body parsing middleware
app.use('/crawler', crawlerRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});