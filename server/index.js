require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());

const PORT = 3001;

/*
========================================
CALLS TODAY
========================================
*/

app.get('/calls-today', async (req, res) => {

    try {

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const from = Math.floor(today.getTime() / 1000);

        let totalCalls = 0;

        let inboundCalls = 0;
        let outboundCalls = 0;

        let inboundAnswered = 0;
        let inboundMissed = 0;
        let inboundOther = 0;

        let page = 1;

        let hasMore = true;

        while (hasMore) {

            console.log(`Fetching page ${page}...`);

            const response = await axios.get(
                `https://api.aircall.io/v1/calls?from=${from}&per_page=50&page=${page}`,
                {
                    auth: {
                        username: process.env.AIRCALL_ID,
                        password: process.env.AIRCALL_TOKEN
                    }
                }
            );

            const calls = response.data.calls || [];

            totalCalls += calls.length;

            calls.forEach(call => {

                if (call.direction === 'inbound') {
                    inboundCalls++;

                    if (call.status === 'done') {
                        inboundAnswered++;
                    }
                    else if (call.status === 'missed') {
                        inboundMissed++;
                    }
                    else {
                        inboundOther++;
                    }
                }

                if (call.direction === 'outbound') {
                    outboundCalls++;
                }

            });

            console.log(`Page ${page}: ${calls.length} calls`);

            hasMore = response.data.meta?.next_page_link ? true : false;

            page++;
        }

        res.json({
            totalCalls,
            inboundCalls,
            outboundCalls,
            inboundAnswered,
            inboundMissed,
            inboundOther,
            note: "This counts all call records returned by Aircall since local midnight."
        });

    } catch (error) {

        console.error('ERROR:');

        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to fetch calls from Aircall'
        });
    }
});

/*
========================================
WAITING CALLS
========================================
*/

app.get('/waiting-calls', async (req, res) => {

    try {

        const response = await axios.get(
            'https://api.aircall.io/v1/calls?per_page=50',
            {
                auth: {
                    username: process.env.AIRCALL_ID,
                    password: process.env.AIRCALL_TOKEN
                }
            }
        );

        const calls = response.data.calls || [];

        const waitingCalls = calls.filter(call => {

            return (
                call.direction === 'inbound' &&
                call.status !== 'done' &&
                call.status !== 'missed'
            );

        });

        res.json({
            waitingCount: waitingCalls.length,
            waitingCalls
        });

    } catch (error) {

        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to fetch waiting calls from Aircall'
        });
    }
});

app.get('/recent-call-statuses', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.aircall.io/v1/calls?per_page=20',
            {
                auth: {
                    username: process.env.AIRCALL_ID,
                    password: process.env.AIRCALL_TOKEN
                }
            }
        );

        const calls = response.data.calls || [];

        const simplifiedCalls = calls.map(call => ({
            id: call.id,
            direction: call.direction,
            status: call.status,
            started_at: call.started_at,
            answered_at: call.answered_at,
            ended_at: call.ended_at,
            user: call.user?.name,
            number: call.number?.name,
            raw_keys: Object.keys(call)
        }));

        res.json({
            count: simplifiedCalls.length,
            calls: simplifiedCalls
        });

    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to fetch recent call statuses'
        });
    }
});
app.get('/users', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.aircall.io/v1/numbers/1228321',
            {
                auth: {
                    username: process.env.AIRCALL_ID,
                    password: process.env.AIRCALL_TOKEN
                }
            }
        );

        const users = response.data.number.users || [];

const simplifiedUsers = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    availability_status: user.availability_status,
    substatus: user.state,
    available: user.available
}));

        res.json({
            count: simplifiedUsers.length,
            users: simplifiedUsers
        });

    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to fetch users from Aircall V2'
        });
    }
});
app.get('/debug-user/:id', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.aircall.io/v1/users/${req.params.id}`,
            {
                auth: {
                    username: process.env.AIRCALL_ID,
                    password: process.env.AIRCALL_TOKEN
                }
            }
        );

        res.json(response.data.user || response.data);

    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to fetch single user'
        });
    }
});
app.get('/debug/search-calls', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.aircall.io/v1/search/calls',
      {},
      {
        auth: {
          username: process.env.AIRCALL_ID,
          password: process.env.AIRCALL_TOKEN
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);

    res.status(500).json({
      error: 'Search calls debug failed',
      details: error.response?.data || error.message
    });
  }
});
app.get('/debug/*path', async (req, res) => {

    try {

        const response = await axios.get(
            `https://api.aircall.io/v1/${req.params.path.join('/')}`,
            {
                auth: {
                    username: process.env.AIRCALL_ID,
                    password: process.env.AIRCALL_TOKEN
                }
            }
        );

        res.json(response.data);

    } catch (error) {

        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: 'Debug route failed'
        });

    }

});

app.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});