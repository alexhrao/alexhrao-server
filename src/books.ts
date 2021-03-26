import { doc, bookTableName } from './dynamo';

interface Book {
    id: string;
    name: string;
    author: string;
    cover: string;
    pdf: string;
    genres: string[];
    min: number;
    dateAdded: string;
    snaps: number;
    numPages: number;
    recommended?: Recommendation[];
}

interface Recommendation extends Book {
    recommended: undefined;
    match: number;
}

export async function getBooks(): Promise<Book[]> {
    return new Promise<Book[]>((res, rej) => {
        doc.scan({
            TableName: bookTableName,
        }, (err, data) => {
            if (err !== null || data.Items === undefined) {
                console.log(err);
                rej(err);
                return;
            }
            res(data.Items as Book[]);
        });
    });
}

export async function getBook(id: string): Promise<Book> {
    return new Promise<Book>((res, rej) => {
        doc.get({
            TableName: bookTableName,
            Key: {
                id
            }
        }, (err, data) => {
            if (err !== null || data.Item === undefined) {
                console.log(err);
                rej(err);
                return;
            }
            res(data.Item as Book);
        });
    });
}

export async function addSnap(id: string): Promise<void> {
    return new Promise<void>((res, rej) => {
        doc.update({
            TableName: bookTableName,
            Key: {
                id
            },
            UpdateExpression: `SET snaps = snaps + :s`,
            ExpressionAttributeValues: {
                ':s': 1,
            },
        }, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        })
    })
}