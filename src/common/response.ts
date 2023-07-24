import { Response } from 'express';
import { Injectable } from "@nestjs/common";

@Injectable()
export class ResponseUtils{
    sendSuccessResponse(res: Response, message: string, data?: any){
        return res.status(200).json({
            success: true,
            message,
            data
        });
    }

    sendErrorResponse(res: Response, statusCode: number, message: string){
        return res.status(statusCode).json({
            success: false,
            message
        })
    }
}