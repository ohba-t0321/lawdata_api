// グローバル変数を宣言
var xmlData;
var JsonLawData;
window.onload = async function() {
    try {
        const cached = await getLawListFromCache();
        const now = Date.now();
        if (cached && isSameDateInJapan(now, cached.timestamp)) {
            JsonLawData = await cached.data;
        } else {
            // APIのURLを指定
            JsonLawData = await fetchLawList2()
            await saveLawListToCache();
        }
        xmlData = {} 
        await JsonLawData.map(item=>xmlData[item.law_info.law_num]=item.current_revision_info.law_title)
    } catch (err) {
        console.log(`エラー：${err.message}`);
    }


    // クエリパラメータを取得
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get("keyword");
    if (keyword) {
        inputbox = document.getElementById('keyword');
        const decoded = decodeURIComponent(keyword);
        inputbox.value = decoded;
        document.getElementById('searchButton').click();
    }
    const left = params.get("left");
    if (left) {
        await fetchLawDetails(left, 'left');
    }
    const right = params.get("right");
    if (right) {
        await fetchLawDetails(right, 'right');
    }
};

async function fetchLawList2() {
    // APIのURLを指定
    const apiUrlBase = `https://laws.e-gov.go.jp/api/2/laws`;
    try{
        apiBaseResult = await fetch(apiUrlBase + '?limit=1')
                        .then(response=>response.json());
        totalCount = await apiBaseResult.total_count;
        if (isFinite(totalCount)) {
            apiResult = await fetch(apiUrlBase + `?limit=${totalCount}`)
                        .then(response=>response.json());
            return apiResult.laws
        }
    } catch (err) {
        console.log(`エラー：${err.message}`);
    }
};

function isSameDateInJapan(ts1, ts2) {
    const options = { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' };

    const date1 = new Date(ts1).toLocaleDateString('ja-JP', options);
    const date2 = new Date(ts2).toLocaleDateString('ja-JP', options);

    return date1 === date2;
}
