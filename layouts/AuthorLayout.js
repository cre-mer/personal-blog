import SocialIcon from '@/components/social-icons'
import Image from '@/components/Image'
import { PageSEO } from '@/components/SEO'

export default function AuthorLayout({ children, frontMatter }) {
  const {
    name,
    avatar,
    occupation,
    company,
    companyURL,
    email,
    twitter,
    linkedin,
    github,
    availability,
    description,
  } = frontMatter

  return (
    <>
      <PageSEO title={`About me - ${name}`} description={description || `About me - ${name}`} />
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pt-6 pb-8 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            About me
          </h1>
          {availability && (
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Independent security support for your next build.
            </p>
          )}
        </div>
        <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:space-y-0">
          <div className="flex flex-col items-center pt-8">
            <Image
              src={avatar}
              alt={name}
              width={192}
              height={192}
              className="h-48 w-48 rounded-full"
            />
            <h3 className="pt-4 pb-2 text-2xl font-bold leading-8 tracking-tight">{name}</h3>
            <div className="text-center text-gray-500 dark:text-gray-400">{occupation}</div>
            {company && (
              <div className="text-gray-500 dark:text-gray-400">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={companyURL}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  @{company}
                </a>
              </div>
            )}
            {availability && (
              <div className="mt-6 flex w-full flex-col items-center rounded-xl border border-primary-200 bg-primary-50 p-5 text-center dark:border-primary-800 dark:bg-gray-900">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                  {availability}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Available for project work and ongoing engagements.
                </p>
                <a
                  href={`mailto:${email}?subject=Let's%20discuss%20a%20project`}
                  className="mt-4 inline-flex rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600"
                >
                  Let’s discuss your project
                </a>
              </div>
            )}
            <div className="flex space-x-3 pt-6">
              <SocialIcon kind="mail" href={`mailto:${email}`} />
              <SocialIcon kind="github" href={github} />
              <SocialIcon kind="linkedin" href={linkedin} />
              <SocialIcon kind="twitter" href={twitter} />
            </div>
          </div>
          <div className="prose max-w-none pt-8 pb-8 dark:prose-dark xl:col-span-2">{children}</div>
        </div>
      </div>
    </>
  )
}
