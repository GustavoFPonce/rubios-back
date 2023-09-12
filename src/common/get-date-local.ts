export function getDateLocal() {
    var referenceDate = new Date();
    var argentinaTime = new Date(referenceDate.setHours(referenceDate.getHours() - 3));
    return argentinaTime;
}