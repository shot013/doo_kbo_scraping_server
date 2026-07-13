import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScrapeStatus } from '../../domain/entities/scrape-source-health.entity';

@Entity('scrape_source_health')
@Index(['sourceName', 'scrapedAt'])
export class ScrapeSourceHealthOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'source_name', type: 'varchar', length: 64 })
  sourceName: string;

  @Column({ name: 'target_url', type: 'varchar', length: 512, nullable: true })
  targetUrl: string | null;

  @Column({ name: 'status', type: 'enum', enum: ScrapeStatus })
  status: ScrapeStatus;

  @Column({ name: 'http_status_code', type: 'smallint', nullable: true })
  httpStatusCode: number | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ name: 'items_scraped', type: 'integer', nullable: true })
  itemsScraped: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'scraped_at', type: 'timestamptz' })
  scrapedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
