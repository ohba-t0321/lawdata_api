refJson = [
    {'ref':{'lawNum':'昭和二十三年法律第百七十八号','lawArticle':{'Provision':'MainProvision','article':'2','paragraph':'1'},'words':'政令で定める日'},
    'referred':{'lawNum':'昭和四十一年政令第三百七十六号','lawArticle':{'paragraph':'1'}}}
]

// JSONをkey1=value1,key2=value2,...の形に変換する関数
function jsonToString(obj) {
    return Object.entries(obj)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
}

// Function to set up hover functionality
function setupHover() {
    const lawTextElement = document.getElementById('law-content-left');
    const framelawNum = document.getElementById('law-num-left').innerHTML.replace('(','').replace(')','')

    // idを格納するためのセットを作成
    const lawNumSet = new Set();

    // JSONデータをループしてidをセットに追加
    refJson.forEach(item => {
        if (item.ref.lawNum !== undefined) {
            lawNumSet.add(item.ref.lawNum);
        }
    });
    // セットをリストに変換
    const lawNumList = Array.from(lawNumSet);
    console.log(lawNumList);
    if (lawNumList.includes(framelawNum)) {
        refJson.forEach(ref => {
            const words = ref.ref.words;
            const lawNum = ref.referred.lawNum;
            const lawArticle = ref.referred.lawArticle;
            const lawTextHTML = lawTextElement.innerHTML;

            const apiUrl = `https://elaws.e-gov.go.jp/api/1/articles;lawNum=${lawNum};${jsonToString(lawArticle)}`; // ここに実際のAPI URLを入力
            fetch(apiUrl)
            .then(response => response.text())
            .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
            .then(data => {
                textdata = ''
                data.querySelectorAll('Sentence').forEach(selector =>{
                    textdata += selector.innerHTML
                });
                console.log(textdata)
                lawTextElement.innerHTML = lawTextHTML.replace(words, `<span class="hovered" data-popup="${lawNum} 第${lawArticle.Paragraph}条">${words}<span class="popup-text">${textdata}</span></span>`);
                
            });    
        });
    }
}
