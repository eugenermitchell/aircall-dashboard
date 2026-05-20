require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());

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
        let callbackRequests = 0;
        let activeCalls = [];
        let inboundAnswered = 0;
        let inboundMissed = 0;
        let inboundOther = 0;
        let inboundOtherCalls = [];
        let totalWaitSeconds = 0;
        let answeredWaitCount = 0;

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
                if (
                    call.direction === 'inbound' &&
                    call.answered_at === null &&
                    call.ended_at === null
                ) {
                    activeCalls.push({
                        id: call.id,
                        label: 'Waiting',
                        type: 'waiting',
                        seconds: Math.floor(Date.now() / 1000) - call.started_at,
                        raw_digits: call.raw_digits,
                        number: call.number?.name
                    });
                }

                if (
                    call.direction === 'inbound' &&
                    call.answered_at !== null &&
                    call.ended_at === null
                ) {
                    activeCalls.push({
                        id: call.id,
                        label: `Talking to ${call.user?.name || 'Unknown'}`,
                        type: 'talking',
                        seconds: Math.floor(Date.now() / 1000) - call.answered_at,
                        raw_digits: call.raw_digits,
                        number: call.number?.name,
                        user: call.user?.name
                    });
                }
                if (
                    call.direction === 'outbound' &&
                    call.ended_at === null
                ) {
                    activeCalls.push({
                        id: call.id,
                        label: `Outbound with ${call.user?.name || 'Unknown'}`,
                        type: 'outbound',
                        seconds: Math.floor(Date.now() / 1000) - call.started_at,
                        raw_digits: call.raw_digits,
                        number: call.number?.name,
                        user: call.user?.name
                    });
                }
                if (call.direction === 'inbound') {
                    inboundCalls++;
                if (call.status === 'done') {
                     inboundAnswered++;

                  if (call.started_at && call.answered_at) {
                     totalWaitSeconds += call.answered_at - call.started_at;
                       answeredWaitCount++;
                    }
}
                    else if (call.status === 'missed') {
                        inboundMissed++;
                    }
                    else {
                        inboundOther++;

                         inboundOtherCalls.push({
                            id: call.id,
                             status: call.status,
                             direction: call.direction,
                              started_at: call.started_at,
                             answered_at: call.answered_at,
                             ended_at: call.ended_at,
                             duration: call.duration,
                              raw_digits: call.raw_digits,
                              user: call.user?.name,
                             number: call.number?.name
    });
}
                                }
                                const isCallbackRequest = call.tags?.some(
                    tag => tag.name === 'Callback Request'
                );
                if (isCallbackRequest) {
                    callbackRequests++;
                }
                if (
                    call.direction === 'inbound' &&
                    isCallbackRequest
                ) {
                    const callbackCompleted = calls.some(otherCall =>
                        otherCall.direction === 'outbound' &&
                        otherCall.raw_digits === call.raw_digits &&
                        otherCall.started_at > call.ended_at
                    );

                    if (!callbackCompleted) {
                        activeCalls.push({
                            id: call.id,
                            label: 'Callback Pending',
                            type: 'callback',
                            seconds: Math.floor(Date.now() / 1000) - call.ended_at,
                            raw_digits: call.raw_digits,
                            number: call.number?.name
                        });
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
            inboundOtherCalls,
            averageWaitSeconds: answeredWaitCount
                ? Math.round(totalWaitSeconds / answeredWaitCount)
                : 0,
            activeCalls: activeCalls.length,
            currentCalls: activeCalls,
            callbackRequests,
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
app.get('/debug/recent-calls-raw', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.aircall.io/v1/calls?order=desc&per_page=20',
      {
        auth: {
          username: process.env.AIRCALL_ID,
          password: process.env.AIRCALL_TOKEN
        }
      }
    );

    const calls = response.data.calls || [];

    res.json({
      count: calls.length,
      calls: calls.map(call => ({
        id: call.id,
        direction: call.direction,
        status: call.status,
        started_at: call.started_at,
        answered_at: call.answered_at,
        ended_at: call.ended_at,
        duration: call.duration,
        raw_digits: call.raw_digits,
        number: call.number?.name,
        user: call.user?.name,

        // important for discovery
        tags: call.tags,
        missed_call_reason: call.missed_call_reason,
        voicemail: call.voicemail,
        asset: call.asset,
        comments: call.comments,
        cost: call.cost,
        recording: call.recording,
        archived: call.archived,

        // shows every available field name
        raw_keys: Object.keys(call)
      }))
    });
  } catch (error) {
    console.error(error.response?.data || error.message);

    res.status(500).json({
      error: 'Failed to fetch raw recent calls'
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});