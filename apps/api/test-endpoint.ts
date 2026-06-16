import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:4000/transactions?search=th%E1%BB%B1c%20ph%E1%BA%A9m', {
      headers: {
        Authorization: 'Bearer test-token' // The backend logic skips user filtering if no token? No, middleware catches it.
      }
    });
    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

test();
