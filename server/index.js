const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { init } = require('./db');

init();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/stores/:id/ratings', require('./routes/ratings'));

app.get('/api/status', (req, res) => res.json({ ok: true }));

app.listen(port, () => console.log(`Server running on ${port}`));
