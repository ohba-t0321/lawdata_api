const resizer = document.querySelector('.resizer');
const leftPane = document.querySelector('.left');
const rightPane = document.querySelector('.right');

resizer.addEventListener('mousedown', (e) => {
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});
resizer.addEventListener('touchstart', (e) => {
    document.addEventListener('touchmove', resizeTouch);
    document.addEventListener('touchend', stopResizeTouch);
});
function resize(e) {
    const sidebarWidth = document.getElementById('sidebarMenu').offsetWidth 
    const sidebarVisible = document.getElementById('openSidebarMenu').checked * 1
    const containerWidth = document.querySelector('#content').offsetWidth
    const leftWidth = (e.clientX - sidebarWidth * sidebarVisible) / containerWidth * 100;
    const rightWidth = 100 - leftWidth;
    leftPane.style.width = `${leftWidth}%`;
    rightPane.style.width = `${rightWidth}%`;
}
function resizeTouch(e) {
    const touch = e.touches[0];
    const sidebarWidth = document.getElementById('sidebarMenu').offsetWidth 
    const sidebarVisible = document.getElementById('openSidebarMenu').checked * 1
    const containerWidth = document.querySelector('#content').offsetWidth
    const leftWidth = (touch.clientX - sidebarWidth * sidebarVisible) / containerWidth * 100;
    const leftPaneWidth = leftWidth / containerWidth * 100;
    const rightWidth = 100 - leftPaneWidth;
    leftPane.style.width = `${leftWidth}%`;
    rightPane.style.width = `${rightWidth}%`;
}
function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}
function stopResizeTouch() {
    document.removeEventListener('touchmove', resizeTouch);
    document.removeEventListener('touchend', stopResizeTouch);
}