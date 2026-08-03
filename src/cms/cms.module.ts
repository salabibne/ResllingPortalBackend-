import { Module } from '@nestjs/common';
import { AboutModule } from './about/about.module';
import { ContactModule } from './contact/contact.module';
import { FounderBlogModule } from './founder-blog/founder-blog.module';
import { FounderVideoModule } from './founder-video/founder-video.module';
import { FounderModule } from './founder/founder.module';
import { HeroModule } from './hero/hero.module';
import { SectionModule } from './section/section.module';
import { SocialMediaModule } from './social-media/social-media.module';

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
  ],
})
export class CmsModule {}
