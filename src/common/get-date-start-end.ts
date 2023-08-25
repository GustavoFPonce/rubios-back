export function getDateStartEnd(start: Date, end: Date){
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
    endDate.setHours(23, 59, 59, 999);
    endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
    return {
        startDate, endDate
    }
}