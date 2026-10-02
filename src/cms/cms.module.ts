import { Module } from '@nestjs/common';
import { AboutModule } from './about/about.module';
import { ContactModule } from './contact/contact.module';
import { FounderBlogModule } from './founder-blog/founder-blog.module';
import { FounderVideoModule } from './founder-video/founder-video.module';
import { FounderModule } from './founder/founder.module';
import { HeroModule } from './hero/hero.module';
import { SectionModule } from './section/section.module';
import { SocialMediaModule } from './social-media/social-media.module';
import { TeamModule } from './team/team.module';

import { CustomPagesController } from './custom-pages/custom-pages.controller';
import { CustomPagesService } from './custom-pages/custom-pages.service';
import { ProductPageConfigsController } from './product-page-configs/product-page-configs.controller';
import { ProductPageConfigsService } from './product-page-configs/product-page-configs.service';
import { ExternalApisController } from './external-apis/external-apis.controller';
import { ExternalApisService } from './external-apis/external-apis.service';
import { LegalDocumentsController } from './legal-documents/legal-documents.controller';
import { LegalDocumentsService } from './legal-documents/legal-documents.service';

@Module({
  imports: [
    SocialMediaModule,
    ContactModule,
    HeroModule,
    AboutModule,
    SectionModule,
    FounderModule,
    FounderBlogModule,
    FounderVideoModule,
    TeamModule,
  ],
  controllers: [
    CustomPagesController,
    ProductPageConfigsController,
    ExternalApisController,
    LegalDocumentsController,
  ],
  providers: [
    CustomPagesService,
    ProductPageConfigsService,
    ExternalApisService,
    LegalDocumentsService,
  ],
  exports: [
    SocialMediaModule,
    ContactModule,
    HeroModule,
    AboutModule,
    SectionModule,
    FounderModule,
    FounderBlogModule,
    FounderVideoModule,
    TeamModule,
    CustomPagesService,
    ProductPageConfigsService,
    ExternalApisService,
    LegalDocumentsService,
  ],
})
export class CmsModule {}
