const axios = require('axios');

const url = 'https://disclosure2.edinet-fsa.go.jp/WEEE0030.aspx?c01d04b1610243d2a2af23e7952e8b1889fb433827cc41b6e70925fa6b05a48a,bXVsPSZjdGY9b24mZmxzPW9uJmxwcj1vbiZycHI9b24mb3RoPW9uJnllcj0mbW9uPSZwZnM9NiZzZXI9MSZwYWc9MiZzb3I9Mg==,gx-no-cache=1742515838622';

const payload = {
    "MPage": false,
    "cmpCtx": "",
    "parms": [
        {
            "SEARCH_KEY_WORD": "",
            "CONTAIN_FUND": true,
            "SYORUI_SYUBETU": "120,130,140,150,160,170,350,360,010,020,030,040,050,060,070,080,090,100,110,135,136,200,210,220,230,235,236,240,250,260,270,280,290,300,310,320,330,340,370,380,180,190,",
            "TEISYUTU_FROM": "20240321",
            "TEISYUTU_TO": "20250321",
            "FLS": true,
            "LPR": true,
            "RPR": true,
            "OTH": true,
            "TEISYUTU_KIKAN": 6
        },
        "WEEE0030",
        "書類簡易検索画面",
        2,
        1,
        100,
        {
            "SaitoKubun": "",
            "SennimotoId": "WEEE0030",
            "SdtYuzaJoho": {
                "SaishuRoguinJikan": "0000-00-00T00:00:00",
                "KoshinJikan": "0000-00-00T00:00:00",
                "SakujoFuragu": "",
                "Roguinshippaikaisu": 0
            }
        },
        "2",
        false
    ]
}

const config = {
    headers: {
        'ajax_security_token': '5A6EC485E71835D57FCB78D65D88DF8569EA74F02E7AA9C3A0998C32AD94B087',
        'content-type': 'application/json',
        'origin': 'https://disclosure2.edinet-fsa.go.jp',
        'referer': 'https://disclosure2.edinet-fsa.go.jp/WEEE0030.aspx?bXVsPSZjdGY9b24mZmxzPW9uJmxwcj1vbiZycHI9b24mb3RoPW9uJnllcj0mbW9uPSZwZnM9NiZzZXI9MSZwYWc9MiZzb3I9Mg==',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'gxajaxrequest': '1',
        'x-gxauth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJneC1pc3N1ZXIiOiIiLCJneC1wZ20iOiJXRUVFMDAzMCIsImd4LXZhbCI6IiIsImd4LWV4cCI6IjE3NDM4NDQyMjQuMjc3MzMiLCJuYmYiOjE3NDI1MTU4MjQsImV4cCI6MTc0MzgxMTgyNCwiaWF0IjoxNzQyNTE1ODI0fQ.b30TDsVZKMnh92BGbJ6n7ssWqTSiqAbMznCbRLtKcvo'
    }
};

axios.post(url, payload, config)
    .then(response => {
        console.log('Response data:', response.data);
    })
    .catch(error => {
        console.error('Error occurred:', error);
    });