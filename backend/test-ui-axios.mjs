import axios from 'axios';

async function test() {
    const data = {
        cvt_series: '',
        serial_number: '149583',
        cvt_type: 'Inițială',
        cvt_date: '2025-06-05',
        expiry_date: '',
        issuing_authority: '',
        provider: '',
        cabinet: '',
        game_mix: '',
        approval_type: '',
        software: '',
        cvtFile: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoK',
        cvtPreview: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoK',
        cvtFileName: 'Screen_Media_Enterprise_Presentation_Clean.pdf',
        notes: '',
        cvt_file: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoK',
        cvt_filename: 'Screen_Media_Enterprise_Presentation_Clean.pdf',
        cvt_number: 'AUTO-ABCX',
    };

    try {
        const response = await axios.post('http://localhost:3030/api/metrology', data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Server responded with:', error.response.status, error.response.data);
        } else {
            console.error('Network Error:', error.message);
        }
    }
}

test();
