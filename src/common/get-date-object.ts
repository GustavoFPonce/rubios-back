export function getDateObject(date: string){
    const [day, month, year] = date.split('-');
    const dateObject = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return dateObject;
}