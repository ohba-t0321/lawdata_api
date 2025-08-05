// 他法令が参照している情報をJSONで格納しておく
let jsonReferenceData = {};

// 号をさらに分割しているときのため、Subitem1,Subitem2,...Subitem10を定義しておく
subitemNode = []
for (let i=1; i<10 ;i++) {
    subitemNode.push(`Subitem${i}`)
}

async function fetchLawFromAPI(lawNo) {
    // ★ 必要に応じて法令APIに合わせて修正してください
    const url = `https://laws.e-gov.go.jp/api/2/law_data/${encodeURIComponent(lawNo)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("法令の取得に失敗しました");
    return await res.json();
}

async function getLawCacheAndAPI(lawNo) {
    try {
        const cached = await getLawFromCache(lawNo);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_EXPIRE_MS) {
            data = cached.lawData;
        } else {
            data = await fetchLawFromAPI(lawNo);
            await saveLawToCache(lawNo, data);
        }
    } catch (err) {
        console.log(`エラー：${err.message}`);
    }
    return data;
}

async function fetchLawDetails(lawNo, outputFrame) {
    frameContent = document.getElementById(outputFrame)
    lawTitle = frameContent.getElementsByClassName('law-title')[0];
    lawNum = frameContent.getElementsByClassName('law-num')[0];
    lawContent = frameContent.getElementsByClassName('law-content')[0];
    lawTitle.innerHTML = "取得中..."
    lawNum.innerHTML = ''
    lawContent.innerHTML = '';

    if (outputFrame === 'left'){
        document.getElementById('outputFrame').value = 'right';
        if (parseFloat(document.getElementById('right').style.width)>=90){
            document.getElementById('left').style.width='50%'
            document.getElementById('right').style.width='50%'
        }
    }
    else if (outputFrame === 'right'){
        document.getElementById('outputFrame').value = 'left';
        if (parseFloat(document.getElementById('left').style.width)>=90){
            document.getElementById('left').style.width='50%'
            document.getElementById('right').style.width='50%'
        }
    };

    data = await getLawCacheAndAPI(lawNo);
    lawTitle.innerHTML = data.revision_info.law_title;
    lawNum.innerHTML =  "(" + data.law_info.law_num + ")";
    
    lawFullText = data.law_full_text;
    
    // ルートノードから開始してHTMLに変換
    lawContent.innerHTML = children(lawFullText);
    // 各要素に対して、カッコの色分けを行う
    await annotation(outputFrame);

    // 法令内の他法令参照データをdict型に格納する
    getReferenceList(outputFrame);

    // 他法令からの参照データを取得しておく
    const framelawNum = document.getElementById('law-num-' + outputFrame).innerHTML.replace('(','').replace(')','')
    const file = './ref_json/' + framelawNum + '.json';

    jsonReferenceData[outputFrame] = await fetch(file).then(response => response.json())
        .catch(error => console.error('データの読み込みに失敗しました:', error));
    // すべてのセクションを監視対象として登録
    document.querySelectorAll('.xml-Sentence').forEach(sentence => {
        observer.observe(sentence);
    });
    // hovered = await setupHover_reference(outputFrame);
    // hovered.forEach(itm=>{
    //     setupLink(itm);
    // });
};
// 右クリックでspan内の文字列をコピーする処理
document.oncontextmenu = function(event){
    if (event.target.matches('.xml-Sentence')) {
        const targetElement = event.target;
        if (targetElement.closest('#left')){
            selectedElement = document.querySelector('#left')
        }
        else if (targetElement.closest('#right')){
            selectedElement = document.querySelector('#right')
        }
        const groupValue = targetElement.getAttribute('data-article');
        const elements = selectedElement.querySelectorAll(`[data-article="${groupValue}"]`)
        let text = ''
        elements.forEach(element=> {
            // xml-Articleのデータは一番外側のデータなので、当該データが抽出できれば十分。
            if (element.className === 'xml-Article'){
                text += element.innerText
            }
        });
        text = text.replaceAll('★引用条文★', '');
        navigator.clipboard.writeText(text).then(() => {
            alert('テキストがコピーされました: ' + text);
        }).catch(err => {
            console.error('コピーに失敗しました: ', err);
        });
        return false;
    }
};

document.getElementById('closeButton').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('reference').style.opacity = 0;
    document.getElementById('reference').style.zIndex = 0;
});

// IntersectionObserverのコールバック関数
const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // 他の法令への引用を付加
            sentence = entry.target;
            if (sentence.closest('.left')){
                outputFrame = 'left';
            }
            else if (sentence.closest('.right')) {
                outputFrame = 'right';
            }
            else {
                outputFrame = undefined;
            }
            if (outputFrame){
                if (sentence.closest('.xml-SupplProvision:not([data-article="SupplProvision-0"])')){
                    lawNumData = sentence.closest('.xml-SupplProvision:not([data-article="SupplProvision-0"])');
                    lawNo = lawNumData.getAttribute('data-article').replace('-0','');
                }
                else {
                    lawNo = document.getElementById('law-num-' + outputFrame).innerHTML.replace('(','').replace(')','');
                }
                const value1 = referenceList[lawNo];
                if (value1){
                    const searchResults = value1.searchResults;
                    const synonym = value1.synonym;
                    // 要素がビューポートに入ったらリンクを付与
                    searchResults.forEach(lawNum => {
                        setupHover(sentence, synonym, lawNum);
                    });
                    setupHover_reference2(outputFrame, sentence);
                    hovered = sentence.querySelectorAll('.hovered');
                    hovered.forEach(itm=>{
                        setupLink(itm);
                    });
                }
            }
            // 1度リンクを付与したら監視を解除する
            observer.unobserve(entry.target);
        }
    });
};

// IntersectionObserverのオプション
const options = {
    root: null, // ビューポートがroot
    rootMargin: '0px',
    threshold: 0.1 // 要素が10%以上表示されたときに検知
};

// IntersectionObserverを作成
const observer = new IntersectionObserver(observerCallback, options);

function children(json, provision = 'MainProvision', articleNo = 0, paragraphNo = 0, itemNo = 0, articleTitle = '') {
    let html = '';
    json.children.forEach(j=>{
        if (typeof(j)==='string'){
            // テキストが「附則」の場合は、法令番号を付加
            if (j.replace(/\s/g,'')==='附則' && provision != 'SupplProvision') {
                html += j + '（' + provision + '）';
                
            } else {
                html += j;
            }
        } else {
            // 属性が目次以前の場合は省略
            if (j.tag !='LawTitle' && j.tag !='LawNum' && j.tag !='TOC') {
                // Articleタグの場合は、ArticleTitleを取得(第○条の記載が格納されている)
                if (j.tag === 'Article'){
                    j.children.filter(c=>c.tag === 'ArticleTitle').forEach(c=>{
                        if (c.children && c.children.length > 0) {
                            articleTitle = c.children[0];
                        } else {
                            articleTitle = '';
                        }
                    });
                }
                /*
                各法令の条文に対して、「第〇条第〇項第〇号」という情報を付加していく
                各ノードの子ノードに情報を継承させる
                */
                if (j.tag === 'MainProvision') {
                    provision = 'MainProvision';
                    articleNo = 0;
                    paragraphNo = 0;
                    itemNo = 0;
                } else if (j.tag === 'SupplProvision') {
                    if (j.attr && j.attr.AmendLawNum) {
                        suppldate = j.attr.AmendLawNum;
                        provision = suppldate;
                    } else {
                        provision = 'SupplProvision';
                    }
                    articleNo = 0;
                    paragraphNo = 0;
                    itemNo = 0;
                } else if (j.tag === 'Article') {
                    articleNo = j.attr && j.attr.Num ? j.attr.Num : 0;
                    paragraphNo = 0;
                    itemNo = 0;
                } else if (j.tag === 'Paragraph') {
                    paragraphNo = j.attr && j.attr.Num ? j.attr.Num : 0;
                    itemNo = 0;
                } else if (j.tag === 'Item') {
                    itemNo = j.attr && j.attr.Num ? j.attr.Num : 0;
                } else if (subitemNode.indexOf(j.tag) >= 0) {
                    itemNo += '-' + (j.attr && j.attr.Num ? j.attr.Num : 0);
                }
                //属性の情報を付加
                tagAttr = '';
                Object.entries(j.attr || {}).forEach(([key, value]) => {
                    tagAttr += ` ${key}="${value}"`;
                });
                tagAttr += ` data-article="${provision}-${articleNo}" data-item="${provision}-${articleNo}-${paragraphNo}-${itemNo}"`;
                if (j.tag === 'Table') {
                    html += `<table class="lawDataTable">${children(j,provision,articleNo,paragraphNo,itemNo)}</table>`;
                } else if (j.tag === 'TableRow') {
                    html += `<tr>${children(j,provision,articleNo,paragraphNo,itemNo)}</tr>`;
                } else if (j.tag === 'TableColumn') {
                    html += `<td${tagAttr}>${children(j,provision,articleNo,paragraphNo,itemNo)}</td>`;
                } else if (j.tag === 'ParagraphNum' && j.children && j.children.length === 0) {
                    // ParagraphNumの子が空の場合(第1項は通常空になる)は、ArticleTitleを取得して表示
                    html += `<span class="xml-${j.tag}"${tagAttr}>${articleTitle}　</span>`;
                } else if (j.tag != 'ArticleTitle') {
                    html += `<span class="xml-${j.tag}"${tagAttr}>${children(j,provision,articleNo,paragraphNo,itemNo,articleTitle)}`
                    if (j.tag.indexOf('Num')>0 || j.tag.indexOf('Title')>0 ) {
                        html += '　';
                    }
                    html += `</span>`;
                }
            }
        }
    });
    return html;
}