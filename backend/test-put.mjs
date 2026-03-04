import axios from 'axios';

async function run() {
  try {
    const res = await axios.put('http://localhost:5001/api/metrology/29', {
      cvt_series: 'IC_ROM.SFX.1001.01#132',
      serial_number: '190269',
      cvt_type: 'Periodică',
      cvt_date: '2024-03-04',
      issuing_authority: 'BMM',
      provider: 'EGT',
      cabinet: 'EGT-VS24',
      game_mix: 'BELL LINK BOOST',
      software: 'BELL LINK BOOST',
      raw_cvt_data: {},
      commission_name: 'Comisia test',
      cvt_file: 'true'
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
