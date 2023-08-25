import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ReportService } from './report.service';

@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    @Get('commissions')
    async getCommissions(){
        return await this.reportService.getCommissions();
    }
}
