// グローバル変数を宣言
var xmlData;

window.onload = async function() {


    try {
        const cached = await getLawListFromCache();
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_EXPIRE_MS) {
            xmlData = await cached.data;
        } else {
            // APIのURLを指定
            const apiUrl = `https://laws.e-gov.go.jp/api/1/lawlists/1`;

            // APIを呼び出してXMLデータを取得
            xmlData = await fetch(apiUrl)
                .then(response => response.text())
                .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
                .then(data => {
                    const laws = data.getElementsByTagName('LawNameListInfo');
                    const obj = {}
                    Array.from(laws).forEach(law => {
                        const title = law.getElementsByTagName('LawName')[0].textContent;
                        const lawNo = law.getElementsByTagName('LawNo')[0].textContent;
                        obj[lawNo] = title
                    });
                    return obj;
                })
                .catch(error => {
                    console.error('Error fetching XML data:', error);
                    // エラーが発生した場合は空のオブジェクトを返す
                    return {};
                });
                await saveLawListToCache();
        }
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

function xmlToJson(xml) {
    const obj = {};
    if (xml.nodeType === 1) { // element
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (let j = 0; j < xml.attributes.length; j++) {
                const attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) { // text
        obj = xml.nodeValue;
    }
    if (xml.hasChildNodes()) {
        for (let i = 0; i < xml.childNodes.length; i++) {
            const item = xml.childNodes.item(i);
            const nodeName = item.nodeName;
            if (typeof(obj[nodeName]) === "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof(obj[nodeName].push) === "undefined") {
                    const old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}

function createDataMap(jsonObj, key) {
    const map = new Map();
    function traverse(obj) {
        if (obj && typeof obj === 'object') {
            if (obj[key]) {
                map.set(obj[key], obj);
            }
            for (const k in obj) {
                if (obj.hasOwnProperty(k)) {
                    traverse(obj[k]);
                }
            }
        }
    }
    traverse(jsonObj);
    return map;
};