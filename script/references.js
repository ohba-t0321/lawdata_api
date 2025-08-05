let referenceList={};

let clickItm;
let itmIndex;
itmIndex = 0;
// 漢数字を算用数字に直す関数
function kanjiToNumber(kanji) {
    if (kanji){
        const kanjiMap = {
            '〇': 0,
            '一': 1,
            '二': 2,
            '三': 3,
            '四': 4,
            '五': 5,
            '六': 6,
            '七': 7,
            '八': 8,
            '九': 9,
            '十': 10,
            '百': 100,
            '千': 1000,
            '万': 10000,
            '億': 100000000,
            '兆': 1000000000000,
        };
        let result = 0;
        let temp = 0;
        let temp_10000 = 0; // 万以上の単位が出てきた時のために、万、億…の数字を記憶しておく
        let currentMultiplier = 1; // 十、百、千を記憶しておく（以降、位数と表記）
        let baseMultiplier = 1; // 万（将来的には億、兆、京）が出てきた場合に記憶しておく

        for (let i = kanji.length - 1; i >= 0; i--) {
            const char = kanji[i];
            const value = kanjiMap[char];

            if (value >=10000) {
                if (currentMultiplier>1) {
                    // currentMultiplierが1出ないときは、千百、百十のように位数が連続して「一」が省略されている。
                    temp_10000 += currentMultiplier
                    // 位数を初期化するほうがわかりやすいが次の処理で上書きするので省略
                }
                temp += temp_10000 * baseMultiplier // 万が出てきた時は九千九百九十九までを、億が出てきた時は万の部分…を記憶
                baseMultiplier = value;
                currentMultiplier = 1;
                temp_10000 = 0;
            } else if (value >=10) {
                if (currentMultiplier>1) {
                    // currentMultiplierが1出ないときは、千百、百十のように位数が連続して「一」が省略されている。
                    temp_10000 += currentMultiplier
                    // 位数を初期化するほうがわかりやすいが次の処理で上書きするので省略
                }
                currentMultiplier = value;
            } else {
                // 一～九の数字が出てきた場合、1つ前の位数と掛け合わせる
                temp_10000 += value * currentMultiplier
                currentMultiplier = 1 // 位数を初期化
            }
        }
        // 万が出てきた時は九千九百九十九までを、億が出てきた時は万の部分…を記憶
        // 最上位の位は処理できていないので最後に処理する
        if (currentMultiplier>1) {
            temp_10000 += currentMultiplier
        }
        temp += temp_10000 * baseMultiplier 
        return temp;
    } else {
        return undefined;
    }
};

function getReferenceList(outputFrame){
    frameContent = document.getElementById(outputFrame)
    frameLawNum = frameContent.getElementsByClassName('law-num')[0].innerText;
    frameLawNum = frameLawNum.replace(/[\(\)]/g, '').trim(); // 法令番号の括弧内の文字列を削除
    frameHTML = frameContent.getElementsByClassName('law-content')[0];
    // MainProvisionについての参照を作る
    lawTextList = [];
    ['EnactStatement', 'Preamble', 'MainProvision', 'SupplProvision'].forEach(tag=>{
        frameHTML.querySelectorAll('.xml-'+tag).forEach(e=>{
            if (!e.hasAttribute('AmendLawNum')){ // AmendLawNumがある場合は附則なので除外
                lawTextList.push(e.textContent);
            }
        });
    })
    value1 = getReferenceList_sub(lawTextList);
    referenceList[frameLawNum]={};
    referenceList[frameLawNum]['searchResults'] = value1.searchResults;
    referenceList[frameLawNum]['synonym'] = value1.synonym; 

    // SupplProvisionについての参照を作る
    frameHTML.querySelectorAll('.xml-SupplProvision').forEach(e=>{
        if (e.hasAttribute('AmendLawNum')){ // AmendLawNumがある場合
            AmendLawNum = e.getAttribute('AmendLawNum')
            lawTextList = [];
            lawTextList.push(e.textContent);
            value1 = getReferenceList_sub(lawTextList);
            referenceList[AmendLawNum]={};
            referenceList[AmendLawNum]['searchResults'] = value1.searchResults;
            referenceList[AmendLawNum]['synonym'] = value1.synonym; 
        }
    });
}

function getReferenceList_sub(lawTextList){
    const regex = /(?<=（)((?:令和|平成|昭和|大正|明治)[元一二三四五六七八九十]+年(?:法律|政令|(?:[^）]?省令)|内閣府令)第[一二三四五六七八九十百千万]+号)(?:。以下「([^）]*?)」という。)?(?=）)/g;
    const searchResults = new Set();
    const synonym = {};
    lawTextList.forEach(text=>{
        while ((match = regex.exec(text)) !== null) {
            if (match[1]){
                searchResults.add(match[1]);
                if (match[2]){
                    synonym[match[1]] = match[2];
                }
            }
        };
    });
    searchResults.forEach(lawNum => {
        /*
        法令の参照では以下の記述となっていることが多いので、正規表現で該当するところを取得した。
        [法令名が初めて現れる場合]：(法令名)（元号○○年法律/政令/...第○号）第○条第○項
        [法令名が初めて現れる場合で、法令を省略する場合](法令名)（元号○○年法律/政令/...第○号。以下「○○法」という。）第○条第○項
        [法令名が2回目以降の場合](法令名もしくは略称名)第○条第○項
        なお、「第○条」のところは「第○条の○」となるケースもあるため、それに対応している
        法律によっては第○条の○条の○…と続くことがあるが、それは対応が難しいので非対応
        */
        const synonymRegex = new RegExp(xmlData[lawNum] + '（以下「(.*?)」という。）' , 'g');
        lawTextList.forEach(text=>{
            while ((match = synonymRegex.exec(text)) !== null) {
                if (match[1]){
                    if (!(synonym[lawNum])){ //附則で改正法令によって上書きしていることがあるため、最初に出てきたものを優先する
                        synonym[lawNum] = match[1];
                    }
                }
            }
        });
    });
    // searchResultsをソート
    const sortedResults = Array.from(searchResults).sort((a, b) => {
        const nameA = synonym[a] || xmlData[a] || 1;  // 法令番号がxmlDataに存在しない場合、1とする
        const nameB = synonym[b] || xmlData[b] || 1;
        return nameB.length - nameA.length;  // 長さでソート（降順）
    });
    return {
        searchResults: sortedResults, 
        synonym: synonym
    }
;}

function setregex(left_right){
    const searchResults = new Set();
    const synonym = {};
    const lawTextElement = document.getElementById('law-content-' + left_right).textContent;
    const regex = /(?<=（)((?:令和|平成|昭和|大正|明治)[元一二三四五六七八九十]+年(?:法律|政令|(?:[^）]?省令)|内閣府令)第[一二三四五六七八九十百千万]+号)(?:。以下「([^）]*?)」という。)?(?=）)/g;
    while ((match = regex.exec(lawTextElement)) !== null) {
        if (match[1]){
            searchResults.add(match[1]);
            if (match[2]){
                synonym[match[1]] = match[2];
            }
        }
    };
    searchResults.forEach(lawNum => {
        /*
        法令の参照では以下の記述となっていることが多いので、正規表現で該当するところを取得した。
        [法令名が初めて現れる場合]：(法令名)（元号○○年法律/政令/...第○号）第○条第○項
        [法令名が初めて現れる場合で、法令を省略する場合](法令名)（元号○○年法律/政令/...第○号。以下「○○法」という。）第○条第○項
        [法令名が2回目以降の場合](法令名もしくは略称名)第○条第○項
        なお、「第○条」のところは「第○条の○」となるケースもあるため、それに対応している
        法律によっては第○条の○条の○…と続くことがあるが、それは対応が難しいので非対応
        */
        const synonymRegex = new RegExp(xmlData[lawNum] + '（以下「(.*?)」という。）' , 'g');
        while ((match = synonymRegex.exec(lawTextElement)) !== null) {
            if (match[1]){
                if (!(synonym[lawNum])){ //附則で改正法令によって上書きしていることがあるため、最初に出てきたものを優先する
                    synonym[lawNum] = match[1];
                }
            }
        }
    });

    // searchResultsをソート
    const sortedResults = Array.from(searchResults).sort((a, b) => {
        const nameA = synonym[a] || xmlData[a] || 1;  // 法令番号がxmlDataに存在しない場合、1とする
        const nameB = synonym[b] || xmlData[b] || 1;
        return nameB.length - nameA.length;  // 長さでソート（降順）
    });
    return {
        searchResults: sortedResults, 
        synonym: synonym};
};

// Function to set up hover functionality
async function setupHover(lawTextElement, synonym, lawNum) {
    const regex = new RegExp('(?:' + xmlData[lawNum] + (synonym[lawNum]? '|' + synonym[lawNum] : '') + ')' + '(?:<span class=".*?">（(?:' + lawNum + ')?。?(?:以下<span class=".*?">「[^「]*?」</span>という。)?）</span>)?(附則)?第([一二三四五六七八九十百千万]+)条(?:の([一二三四五六七八九十百千万]+))?(?:第([一二三四五六七八九十百千万]+)項)?' , 'g');
    const newHTML = lawTextElement.innerHTML.replaceAll(regex,(match, suppl, lawArticleNum, lawArticleSubNum, lawParagraphNum) =>{
        provision = !(suppl)
        lawArticleNum = kanjiToNumber(lawArticleNum);
        lawArticleSubNum = kanjiToNumber(lawArticleSubNum);
        lawParagraphNum = kanjiToNumber(lawParagraphNum);
        const lawData = `lawNum=${lawNum}${provision?' provision="MainProvision"':' provision="SupplProvision"'}${lawArticleNum?' article='+lawArticleNum:''}${lawArticleSubNum? '_'+ lawArticleSubNum : ''}${lawParagraphNum? ' paragraph='+ lawParagraphNum: ''}`
        // return `<span class="hovered" ${lawData}><span data-lawnum=${lawNum}>${lawName}</span>${match_rest}</span>`;
        return `<span class="hovered" ${lawData}>${match}</span>`;
    });
    lawTextElement.innerHTML = newHTML;
}

async function setupHover_reference2(outputFrame, sentence) {
    sentenceNum = sentence.getAttribute('data-item');
    sentenceNumParts = sentenceNum.split('-');
    sentenceProvision = sentenceNumParts[0];
    sentenceArticle = sentenceNumParts[1];
    sentenceParagraph = sentenceNumParts[2];
    sentenceItem = sentenceNumParts[3];
    
    data = jsonReferenceData[outputFrame].filter(data=>(data?.referred?.lawArticle?.provision===sentenceProvision)&&(data?.referred?.lawArticle?.article===sentenceArticle)&&(data?.referred?.lawArticle?.paragraph===sentenceParagraph)&&(data?.referred?.lawArticle?.item===sentenceItem))
    lawTextElement = sentence.closest('.xml-Article');
    // 上記でデータが取れなかった時の回避策
    if (!(lawTextElement)){
        lawTextElement = sentence;
    }

    data.forEach(item => {
        referredJson = item.referred.lawArticle;
        referredNum = referredJson.provision + '-' + referredJson.article + '-' + referredJson.paragraph + '-' + referredJson.item;
        refJson = item.ref.lawArticle;
        const words = item.match;
        const regex = RegExp(words, 'g');
        const lawData = `lawNum=${item.ref.lawNum}${refJson.provision==='MainProvision'?' provision="MainProvision"':' provision="SupplProvision"'}${refJson.article!='0'?' article='+refJson.article:''}${' paragraph='+ refJson.paragraph}${refJson.item!=0?' item='+refJson.item:''}`
        const linkSentences = lawTextElement.querySelectorAll('span.xml-Sentence[data-item="'+ referredNum +'"]')
        let links = 0;
        sentence.innerHTML = sentence.innerHTML.replaceAll(regex,match=>{
            links++;
            return `<span class="hovered" ${lawData}>${match}</span>`;
        });
        if (links === 0){
            const lastSentence = linkSentences[linkSentences.length-1];
            if (sentence === lastSentence){
                const lastText = lastSentence.innerHTML
                const refText = '★引用条文★'
                const refregex = /★引用条文★/g;
                if (refregex.exec(lastText) !== null){
                    lastSentence.innerHTML = lastText.replace(refText, `<span class="hovered" ${lawData}>${refText}</span>`)
                } else{
                    lastSentence.innerHTML = lastText + ` <span class="hovered small-text" ${lawData}>${refText}</span>`
                };
            }
        }
        hovered = sentence.querySelectorAll('.hovered')
        hovered.forEach(itm=>{
            setupLink(itm);
        });
    });
}
function setupLink(itm) {
    hovered = itm.parentElement.closest('.hovered');
    if (!(hovered)) {
        itm.addEventListener('click', async (event) => {
            ref_law(itm, 0)
        });
    };
};

async function ref_law(itm,itmIndexAdd){
    // 複数のリンクがあったときに、ボタンの◀▶でitmIndexを操作する。デフォルトは0
    if (itmIndexAdd===0){
        itmIndex = 0;
    } else {
        itmIndex += itmIndexAdd;
    }
    frameContent = document.getElementById('reference');
    frameContent.style.opacity = 1;
    frameContent.style.zIndex = 99;
    refItemIndex = frameContent.getElementsByClassName('ref-item-index')[0];
    lawTitle = frameContent.getElementsByClassName('article-num')[0];
    lawContent = frameContent.getElementsByClassName('law-content')[0];
    refButton = frameContent.getElementsByClassName('ref-buttons')[0];
    lawTitle.innerHTML = '';
    lawContent.innerHTML = '';

    refData = Array.from(itm.querySelectorAll('.hovered'));
    refData.push(itm);
    lenRef = refData.length;
    clickItm = itm;
    itmIndex = itmIndex<0? itmIndex + lenRef : itmIndex; //マイナスになったら最大値に戻す（JSの余りはマイナスを取ってしまうため上記の算式だとうまくいかない）
    itmIndex = itmIndex>=lenRef? itmIndex - lenRef : itmIndex; //アイテム数を超えたら0に戻す
    refItm = refData[itmIndex];
    const lawNum = refItm.getAttribute('lawNum');
    const lawProvision = refItm.getAttribute('provision');
    const lawArticleNum = refItm.getAttribute('article');
    const lawParagraphNum = refItm.getAttribute('paragraph');
    if (lenRef<=1){
        refButton.style.display = 'none';
    } else {
        refButton.style.display = 'block';
    };
    data = await getLawCacheAndAPI(lawNum);
    refLawData = data.law_full_text.children[1].children.filter(e=>e.tag===lawProvision && e.attr.AmendLawNum===undefined)[0];
    refArticle = searchArticle(refLawData).filter(e=>e.attr.Num===lawArticleNum)[0];
    lawTitle.innerHTML = xmlData[lawNum] + ' ' + (lawProvision==='SupplProvision'?'附則':'') + convertToArticleFormat(lawArticleNum);
    if (refArticle.children.length!=0){
        lawContent.innerHTML = children(refArticle);
        lawContent.querySelectorAll('.xml-ArticleCaption, .xml-ArticleTitle').forEach(e=>{
            e.remove();
        });
    }
    refItemIndex.innerHTML = `${itmIndex+1} / ${lenRef}`
};

function searchArticle(json) {
    const articleList = [];
    json.children.forEach(item => {
        if (item.tag === 'Article') {
            articleList.push(item);
        } else if (typeof(item) === 'object' && item.children) {
            subItem = searchArticle(item);
            if (subItem) {
                subItem.forEach(sub => {
                    articleList.push(sub);
                });
            }
        }
    });
    return articleList;
};

function convertToArticleFormat(input) {
    // アンダースコアで分割して配列にする
    if (input){

        const parts = input.split('_');

        // 最初の部分を「第◯条」に変換
        let result = `第${parts[0]}条`;

        // 残りの部分があれば「の◯」を追加
        for (let i = 1; i < parts.length; i++) {
            result += `の${parts[i]}`;
        }

        return result;
    } else {
        return '';
    }
}
