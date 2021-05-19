
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: 'range' })
export class RangePipe implements PipeTransform {
    constructor() { }

    transform(_input: any): any {
        const range: number[] = [];
        for (let length = 0; length < _input; ++length) {
            range.push(length);
        }

        return range;
    }
}