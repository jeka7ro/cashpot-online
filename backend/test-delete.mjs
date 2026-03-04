import axios from 'axios';

async function run() {
    try {
        const res = await axios.delete('http://localhost:5001/api/metrology/29');
        console.log(res.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
    }
}
run();
