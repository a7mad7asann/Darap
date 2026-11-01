import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: StorageProvider,
      useFactory: (configService: ConfigService) => {
        const provider = (
          configService.get<string>('STORAGE_PROVIDER', 'local') || 'local'
        ).toLowerCase();
        if (provider === 's3' || provider === 'r2') {
          return new S3StorageProvider(configService);
        }
        return new LocalStorageProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [FilesService, StorageProvider],
})
export class FilesModule {}
